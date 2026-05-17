import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth, useBuy, useConsensus, useMarket, usePreviewPayout } from '@functionspace/react';
import type { PayoutCurve } from '@functionspace/core';
import { PageShell } from '../components/PageShell';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Pill } from '../components/Pill';
import { MarketIcon } from '../components/MarketIcon';
import { MarketStats } from '../components/MarketStats';
import { AuthSheet } from '../components/AuthSheet';
import { MarketPickerModal } from '../components/MarketPickerModal';
import { GoalCelebration } from '../components/GoalCelebration';
import { Pitch } from '../game/Pitch';
import { useKickEngine, type ShotType } from '../game/useKickEngine';
import { useComposedBelief } from '../game/useComposedBelief';
import { useRound, ROUND_CONSTANTS } from '../state/RoundContext';

export default function Game() {
  const navigate = useNavigate();
  const { marketId } = useParams<{ marketId: string }>();
  const { market } = useMarket(marketId ?? '');
  const { consensus } = useConsensus(marketId ?? '', 80);
  const round = useRound();
  const [shotType, setShotType] = useState<ShotType>('direct');
  const engine = useKickEngine(market, shotType);
  const composed = useComposedBelief(market, round.kicks, 80);
  const kicksRemaining = ROUND_CONSTANTS.MAX_KICKS - round.kicks.length;
  const { isAuthenticated, refreshUser } = useAuth();
  const buy = useBuy(marketId ?? '');
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Ensure the round context is bound to the URL's marketId. This handles
  // direct links and the in-Game "Change market" flow which navigates
  // straight here without going through Stake.
  useEffect(() => {
    if (marketId) round.startRound(marketId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketId]);

  const submitBuy = useCallback(async () => {
    if (!composed) return;
    setSubmitting(true);
    try {
      await buy.execute(composed.vector, round.stake);
      setCelebrating(true);
      refreshUser().catch(() => { });
      // Hold the celebration for ~1.5s so the spring + GOOOAL! lands, then
      // navigate to the /calls list which acts as the receipt.
      setTimeout(() => {
        round.resetKicks();
        navigate('/calls');
      }, 1500);
    } catch {
      // Surface the error in the footer; the celebration won't trigger.
    } finally {
      setSubmitting(false);
    }
  }, [composed, buy, round, navigate, refreshUser]);

  // After guest taps Submit and signs in, kick off the buy automatically.
  useEffect(() => {
    if (isAuthenticated && pendingSubmit) {
      setPendingSubmit(false);
      setAuthOpen(false);
      void submitBuy();
    }
  }, [isAuthenticated, pendingSubmit, submitBuy]);

  // Live payout preview, debounced. Skipped for guests because the SDK client
  // rejects all POSTs without a token; sign-in is offered inline instead.
  const preview = usePreviewPayout(marketId ?? '');
  const [payout, setPayout] = useState<PayoutCurve | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(false);
  useEffect(() => {
    if (!composed || !isAuthenticated) {
      setPayout(null);
      setPayoutLoading(false);
      return;
    }
    setPayoutLoading(true);
    const id = setTimeout(async () => {
      try {
        const curve = await preview.execute(composed.vector, round.stake);
        setPayout(curve);
      } catch {
        setPayout(null);
      } finally {
        setPayoutLoading(false);
      }
    }, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composed, round.stake, isAuthenticated]);

  // After ball lands, hold briefly so the user sees the kick on the goal-line,
  // then commit the region to round state and reset the engine to 'ready'.
  useEffect(() => {
    if (engine.state !== 'landed') return;
    const id = setTimeout(() => {
      const region = engine.commit();
      if (region) round.addKick(region);
    }, 650);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.state]);

  // Aim dot: live during 'aiming' (driven by ref, no re-render),
  // locked during 'timing'/'flying', absent otherwise.
  const aim = useMemo<
    | { kind: 'live'; phaseRef: typeof engine.aimPhaseRef }
    | { kind: 'locked'; x: number }
    | null
  >(() => {
    if (engine.state === 'aiming') return { kind: 'live', phaseRef: engine.aimPhaseRef };
    if (engine.aimX != null && (engine.state === 'timing' || engine.state === 'flying')) {
      return { kind: 'locked', x: engine.aimX };
    }
    return null;
  }, [engine.state, engine.aimPhaseRef, engine.aimX]);

  // The ball target. When flying or just landed, place at landingX.
  const ballTarget = useMemo(() => {
    if (
      (engine.state === 'flying' || engine.state === 'landed') &&
      engine.landingX != null
    ) {
      return { x: engine.landingX };
    }
    return null;
  }, [engine.state, engine.landingX]);

  const showTiming = engine.state === 'timing' || engine.state === 'flying';

  // Curved shot-meter overlay. Visible while picking timing (and frozen during
  // flight so the user can see where they released).
  const timing = useMemo(
    () =>
      showTiming
        ? {
          phaseRef: engine.timingPhaseRef,
          sweetSpotHalfWidth: engine.sweetSpot.halfWidth,
          locked: engine.state === 'flying',
        }
        : null,
    [showTiming, engine.timingPhaseRef, engine.sweetSpot.halfWidth, engine.state],
  );

  const primaryDisabled =
    !market ||
    kicksRemaining === 0 ||
    engine.state === 'flying' ||
    engine.state === 'landed';

  // Three numbers from the curves:
  //  - expected: ∫ belief(x) · payout(x) dx -- probability-weighted payout
  //    under the user's own belief. Note: uses the user's belief, so a
  //    contrarian "chasing thin-crowd zones" bet can self-confirm a big
  //    Expected. The alignment metric below counterbalances that.
  //  - bestCase: global ceiling, straight from the server.
  //  - crowdAlignment: Bhattacharyya coefficient between the user's belief
  //    and the crowd's belief. Bounded [0, 1]. Tells the user how much their
  //    bet actually overlaps with where the market thinks the outcome will
  //    land -- a low number flags a contrarian bet even when Expected is fat.
  const payoutSummary = useMemo(() => {
    if (!payout || !composed) return null;
    if (!payout.previews || payout.previews.length === 0) return null;
    const sorted = [...payout.previews].sort((a, b) => a.outcome - b.outcome);
    const payoutAt = (x: number): number => {
      if (x <= sorted[0].outcome) return sorted[0].payout;
      const last = sorted[sorted.length - 1];
      if (x >= last.outcome) return last.payout;
      for (let i = 1; i < sorted.length; i++) {
        const a = sorted[i - 1];
        const b = sorted[i];
        if (x >= a.outcome && x <= b.outcome) {
          const t = (x - a.outcome) / (b.outcome - a.outcome);
          return a.payout + t * (b.payout - a.payout);
        }
      }
      return last.payout;
    };

    // Trapezoidal integration of payout(x) · belief(x) dx over the user's
    // belief PDF. evaluateDensityCurve's analytical scale slightly mis-
    // normalizes for non-uniform coefficients (boundary B-spline basis
    // functions are truncated, so a single interior bucket integrates to
    // (K+2)/K instead of 1), so divide by the belief's own trapezoid mass
    // to guarantee expected <= max(payout).
    const pts = composed.curve.points;
    let expected = 0;
    let beliefMass = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const dx = b.x - a.x;
      const ga = payoutAt(a.x) * a.y;
      const gb = payoutAt(b.x) * b.y;
      expected += ((ga + gb) / 2) * dx;
      beliefMass += ((a.y + b.y) / 2) * dx;
    }
    if (beliefMass > 0) expected /= beliefMass;

    // Bhattacharyya coefficient: ∫ √(user(x) · crowd(x)) dx. Both PDFs are
    // sampled by evaluateDensityCurve on the same uniform grid, so we can
    // zip pointwise. If the consensus isn't loaded yet, skip -- the row will
    // just not render.
    let crowdAlignment: number | null = null;
    if (consensus && consensus.points.length === pts.length) {
      const cPts = consensus.points;
      let bc = 0;
      for (let i = 1; i < pts.length; i++) {
        const ya = Math.sqrt(Math.max(0, pts[i - 1].y) * Math.max(0, cPts[i - 1].y));
        const yb = Math.sqrt(Math.max(0, pts[i].y) * Math.max(0, cPts[i].y));
        bc += ((ya + yb) / 2) * (pts[i].x - pts[i - 1].x);
      }
      crowdAlignment = Math.max(0, Math.min(1, bc));
    }

    return { expected, bestCase: payout.maxPayout, crowdAlignment };
  }, [payout, composed, consensus]);

  // Color the expected figure by direction vs stake so the user can see win
  // vs loss without an inline delta. Threshold cents so a near-break-even bet
  // reads as neutral text instead of pseudo-positive.
  const expectedColor = useMemo(() => {
    if (!payoutSummary) return 'var(--sp-text)';
    const delta = payoutSummary.expected - round.stake;
    if (delta > 0.05) return 'var(--sp-positive)';
    if (delta < -0.05) return 'var(--sp-negative)';
    return 'var(--sp-text)';
  }, [payoutSummary, round.stake]);

  const canFinalize =
    round.kicks.length > 0 && engine.state === 'ready' && !submitting && !celebrating;
  const handleSubmit = () => {
    if (!canFinalize) return;
    if (!isAuthenticated) {
      setPendingSubmit(true);
      setAuthOpen(true);
      return;
    }
    void submitBuy();
  };
  const handleClear = () => {
    if (!canFinalize) return;
    round.resetKicks();
  };

  const submitLabel = submitting
    ? 'Striking…'
    : !isAuthenticated && round.kicks.length > 0
      ? 'Sign in to submit'
      : 'Submit';

  return (
    <PageShell
      header={<Header onBack={() => navigate(-1)} centerLabel="Free kick" />}
      footer={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {buy.error && (
            <div
              style={{
                color: 'var(--sp-negative)',
                fontSize: '12px',
                textAlign: 'center',
              }}
            >
              {buy.error.message}
            </div>
          )}
          {/* Shot-type chooser. Default 'direct' matches the original kick;
           *  the others reshape the committed region without changing the
           *  aim/time flow. Disabled while a kick is in flight. */}
          <ShotTypeChips
            value={shotType}
            onChange={setShotType}
            disabled={engine.state !== 'ready'}
          />

          <Pill
            variant="primary"
            size="lg"
            fullWidth
            disabled={primaryDisabled}
            onClick={engine.primaryAction}
          >
            {kicksRemaining === 0
              ? 'Out of kicks'
              : engine.state === 'ready'
                ? 'Kick'
                : engine.primaryLabel}
          </Pill>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Pill
              variant="ghost"
              size="md"
              fullWidth
              disabled={!canFinalize}
              onClick={handleClear}
            >
              Reset
            </Pill>
            <Pill
              variant="secondary"
              size="md"
              fullWidth
              disabled={!canFinalize}
              onClick={handleSubmit}
            >
              {submitLabel}
            </Pill>
          </div>


        </div>
      }
    >
      {/* Market header: title + range + crowd expects + change market.
       *  Stake is no longer shown here -- it's surfaced in the bet summary
       *  card below and on the Confirm screen, where the user can actually
       *  act on it. */}
      <Card padding="md">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {market && <MarketIcon market={market} size={36} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              className="sp-display-md"
              style={{
                fontSize: '14px',
                lineHeight: 1.25,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical' as const,
              }}
            >
              {market?.title ?? 'Loading…'}
            </div>
            {market && (
              <div style={{ marginTop: '4px' }}>
                <MarketStats market={market} size="sm" />
              </div>
            )}
          </div>
          <button
            onClick={() => setPickerOpen(true)}
            aria-label="Change market"
            className="sp-tap sp-tap-surface"
            style={{
              flexShrink: 0,
              padding: '6px 10px',
              borderRadius: '999px',
              background: 'var(--sp-surface-2)',
              border: '1px solid var(--sp-border)',
              color: 'var(--sp-text)',
              fontSize: '11px',
              fontWeight: 600,
              fontFamily: 'var(--sp-font-body)',
              cursor: 'pointer',
            }}
          >
            Change
          </button>
        </div>
      </Card>

      {/* Game canvas with kicks-remaining badge overlay. The bet summary
       *  slot also lives in this wrapper so it can absolutely position
       *  itself as a floating sidebar on wide screens, anchored to the
       *  canvas's right edge. On narrow screens the slot falls back to
       *  inline flow under the pitch. Either way the surrounding column
       *  never reflows when the summary appears after the first kick. */}
      <div style={{ position: 'relative' }}>
        {/* Inner relative wrapper around just the pitch + badge. The
         *  badge anchors to bottom of THIS box, so it stays glued to
         *  the pitch even when the outer wrapper grows on mobile to
         *  contain the inline bet summary below. */}
        <div style={{ position: 'relative' }}>
          <Card padding="none" tone="inset" radius="md" style={{ overflow: 'hidden' }}>
            {market ? (
              <Pitch
                market={market}
                consensus={consensus}
                aim={aim}
                kicks={round.kicks}
                belief={composed?.curve ?? null}
                ballTarget={ballTarget}
                onBallSettled={engine.onLanded}
                timing={timing}
                shotType={shotType}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  aspectRatio: '4 / 3',
                  background: 'var(--sp-surface-2)',
                }}
              />
            )}
          </Card>
          {/* Kicks-remaining badge sits below the ball, anchored to the
           *  bottom of the canvas. Hidden until the market loads so it
           *  doesn't flash over the skeleton. */}
          {market && (
            <KicksRemainingBadge
              taken={round.kicks.length}
              total={ROUND_CONSTANTS.MAX_KICKS}
            />
          )}
        </div>

        {/* Bet summary, appears after first kick. Three figures across the card:
         *   STAKE  ·  EXPECTED (probability-weighted under your belief)  ·  BEST CASE
         * with a "if the crowd is right" anchor underneath. The user's belief
         * shape is shown on the pitch above; we don't try to summarise it as a
         * Gaussian (mean ± σ) here -- that lies for multimodal kicks. */}
        {composed && market && (
          <div className="sp-bet-summary-slot">
            <Card padding="md" tone="inset">
              {isAuthenticated ? (
                <>
                  <div className="sp-bet-summary-grid">
                    <SummaryCell label="Stake">
                      <span className="sp-mono" style={{ color: 'var(--sp-text)' }}>
                        ${formatPayout(round.stake)}
                      </span>
                    </SummaryCell>

                    <SummaryCell label="Expected" align="center">
                      {payoutSummary ? (
                        <span className="sp-mono" style={{ color: expectedColor }}>
                          ${formatPayout(payoutSummary.expected)}
                        </span>
                      ) : (
                        <span className="sp-secondary" style={{ fontSize: '14px' }}>
                          {payoutLoading ? 'previewing…' : '–'}
                        </span>
                      )}
                    </SummaryCell>

                    <SummaryCell label="Best case" align="right">
                      {payoutSummary ? (
                        <span
                          className="sp-mono"
                          style={{ color: 'var(--sp-positive)' }}
                        >
                          ${formatPayout(payoutSummary.bestCase)}
                        </span>
                      ) : (
                        <span className="sp-secondary" style={{ fontSize: '14px' }}>
                          –
                        </span>
                      )}
                    </SummaryCell>
                  </div>

                  {payoutSummary?.crowdAlignment != null && (
                    <div
                      className="sp-secondary"
                      style={{
                        marginTop: '10px',
                        paddingTop: '10px',
                        borderTop: '1px solid var(--sp-border-subtle)',
                        fontSize: '11px',
                        textAlign: 'center',
                      }}
                    >
                      <span
                        className="sp-mono"
                        style={{ color: 'var(--sp-text)', fontWeight: 600 }}
                      >
                        {Math.round(payoutSummary.crowdAlignment * 100)}%
                      </span>{' '}
                      aligned with the consensus
                    </div>
                  )}
                </>
              ) : (
                <div className="sp-bet-summary-guest">
                  <div>
                    <div
                      className="sp-uppercase sp-secondary"
                      style={{ marginBottom: '2px' }}
                    >
                      Stake
                    </div>
                    <div className="sp-display-md" style={{ fontSize: '20px' }}>
                      <span className="sp-mono">${formatPayout(round.stake)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setAuthOpen(true)}
                    className="sp-tap sp-tap-link"
                    style={{
                      color: 'var(--sp-accent)',
                      fontFamily: 'var(--sp-font-body)',
                      fontSize: '14px',
                      fontWeight: 600,
                      padding: 0,
                      lineHeight: 1.2,
                      cursor: 'pointer',
                    }}
                  >
                    Sign in to see payouts →
                  </button>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Phase status / instruction line */}
      <div
        style={{
          minHeight: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '0 8px',
        }}
      >
        <PhaseHint
          state={engine.state}
          kicksTaken={round.kicks.length}
          shotType={shotType}
          aimOutcome={
            engine.aimX != null && market
              ? formatOutcome(
                market.config.lowerBound +
                engine.aimX * (market.config.upperBound - market.config.lowerBound),
                market.decimals ?? 0,
                market.xAxisUnits || '',
              )
              : null
          }
        />
      </div>

      <AuthSheet
        open={authOpen}
        onClose={() => {
          setAuthOpen(false);
          setPendingSubmit(false);
        }}
      />

      <MarketPickerModal
        open={pickerOpen}
        activeMarketId={market?.marketId ?? null}
        onClose={() => setPickerOpen(false)}
        onSelect={(m) => {
          setPickerOpen(false);
          if (m.marketId === market?.marketId) return;
          navigate(`/m/${m.marketId}/play`);
        }}
      />

      <GoalCelebration visible={celebrating} />
    </PageShell>
  );
}

/** Small absolutely-positioned badge that sits at the bottom of the
 *  game canvas (below the ball area). Shows how many kicks the user
 *  has left in the round. */
function KicksRemainingBadge({ taken, total }: { taken: number; total: number }) {
  const remaining = Math.max(0, total - taken);
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: '10px',
        transform: 'translateX(-50%)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 10px',
        borderRadius: '999px',
        background: 'var(--sp-glass-footer)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid var(--sp-border-subtle)',
        fontSize: '11px',
        color: 'var(--sp-text-secondary)',
        pointerEvents: 'none',
      }}
    >
      <KickDots taken={taken} total={total} />
      <span className="sp-mono" style={{ color: 'var(--sp-text)', fontWeight: 600 }}>
        {remaining}
      </span>
      <span>left</span>
    </div>
  );
}

function KickDots({ taken, total }: { taken: number; total: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: '4px' }}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '999px',
            background: i < taken ? 'var(--sp-accent)' : 'var(--sp-border)',
          }}
        />
      ))}
    </span>
  );
}

interface ShotChipDef {
  id: ShotType;
  label: string;
  /** Short, plain-language description shown in the preview panel. */
  description: string;
}

const SHOT_CHIPS: ShotChipDef[] = [
  {
    id: 'direct',
    label: 'Direct',
    description: 'Laser-flat. All your conviction on a single number.',
  },
  {
    id: 'curl',
    label: 'Curl',
    description: 'Bends mid-air. Leans your call toward one side of the target.',
  },
  {
    id: 'chip',
    label: 'Chip',
    description: 'Lifted and lazy. Spreads your call wider around the aim.',
  },
  {
    id: 'sweep',
    label: 'Sweep',
    description: 'A floating cross. Covers a whole band of outcomes at once.',
  },
];

function ShotTypeChips({
  value,
  onChange,
  disabled = false,
}: {
  value: ShotType;
  onChange: (s: ShotType) => void;
  disabled?: boolean;
}) {
  const active = SHOT_CHIPS.find((c) => c.id === value) ?? SHOT_CHIPS[0];
  const [showDescription, setShowDescription] = useState(false);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        opacity: disabled ? 0.55 : 1,
        transition: 'opacity 0.18s var(--sp-ease)',
      }}
    >
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <div
          role="tablist"
          aria-label="Shot type"
          style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '2px',
            flex: 1,
            minWidth: 0,
          }}
        >
          {SHOT_CHIPS.map((chip) => {
            const isActive = chip.id === value;
            return (
              <button
                key={chip.id}
                role="tab"
                aria-selected={isActive}
                disabled={disabled}
                onClick={() => onChange(chip.id)}
                className={isActive ? 'sp-tap' : 'sp-tap sp-tap-surface'}
                style={{
                  flex: '0 0 auto',
                  padding: '6px 12px',
                  borderRadius: '999px',
                  background: 'var(--sp-surface)',
                  color: isActive ? 'var(--sp-text)' : 'var(--sp-text-secondary)',
                  border: isActive
                    ? '1px solid var(--sp-accent-edge)'
                    : '1px solid var(--sp-border)',
                  fontSize: '12px',
                  fontWeight: isActive ? 700 : 600,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-label={showDescription ? 'Hide shot description' : 'Show shot description'}
          aria-expanded={showDescription}
          disabled={disabled}
          onClick={() => setShowDescription((v) => !v)}
          className="sp-tap sp-tap-surface"
          style={{
            flex: '0 0 auto',
            width: '28px',
            height: '28px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '999px',
            background: showDescription ? 'var(--sp-surface-2)' : 'var(--sp-surface)',
            color: showDescription ? 'var(--sp-text)' : 'var(--sp-text-secondary)',
            border: '1px solid var(--sp-border)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            padding: 0,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="11" x2="12" y2="16" />
            <circle cx="12" cy="8" r="0.6" fill="currentColor" />
          </svg>
        </button>
      </div>

      {/* Live preview panel: tiny shape sketch + one-line description
       *  for the currently selected shot type. Collapsed by default;
       *  toggled via the info button above. */}
      {showDescription && (
        <div
          aria-live="polite"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 10px',
            borderRadius: 'var(--sp-radius-sm)',
            background: 'var(--sp-surface-2)',
            border: '1px solid var(--sp-border-subtle)',
          }}
        >
          <ShotShapePreview type={active.id} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              className="sp-uppercase sp-secondary"
              style={{ marginBottom: '1px', fontSize: '10px' }}
            >
              {active.label} shape
            </div>
            <div
              style={{
                fontSize: '12px',
                lineHeight: 1.35,
                color: 'var(--sp-text)',
              }}
            >
              {active.description}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Tiny SVG sketch of the belief shape each shot type produces. Purely
 *  illustrative -- the goal is to communicate "narrow peak" vs "wide hump"
 *  vs "skewed" vs "flat band" at a glance, not to be mathematically exact. */
function ShotShapePreview({ type }: { type: ShotType }) {
  const W = 56;
  const H = 28;
  // Baseline + path per shot type. All paths sit on y = H (the baseline)
  // and peak/extend upward.
  let d = '';
  if (type === 'direct') {
    // Narrow Gaussian-ish peak in the middle.
    d = `M 4 ${H} Q ${W / 2} ${H - 4} ${W / 2 - 6} ${H - 22} Q ${W / 2} ${H - 30} ${W / 2 + 6} ${H - 22} Q ${W / 2} ${H - 4} ${W - 4} ${H}`;
  } else if (type === 'curl') {
    // Skewed bump: peak shifted right, longer left tail.
    d = `M 4 ${H} Q 12 ${H - 4} 24 ${H - 12} Q 32 ${H - 24} 38 ${H - 22} Q 44 ${H - 18} 52 ${H} Z`;
  } else if (type === 'chip') {
    // Wide, lower hump.
    d = `M 4 ${H} Q 14 ${H - 6} 22 ${H - 16} Q ${W / 2} ${H - 22} 34 ${H - 16} Q 42 ${H - 6} ${W - 4} ${H}`;
  } else {
    // Sweep: flat-topped trapezoid band.
    d = `M 6 ${H} L 14 ${H - 14} L 42 ${H - 14} L 50 ${H} Z`;
  }
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden
      style={{ flexShrink: 0, display: 'block' }}
    >
      {/* Baseline (goal-line analogue) */}
      <line
        x1="2"
        y1={H - 0.5}
        x2={W - 2}
        y2={H - 0.5}
        stroke="var(--sp-border)"
        strokeWidth="1"
      />
      {/* Soft halo */}
      <path
        d={d}
        fill="var(--sp-accent)"
        opacity="0.18"
      />
      {/* Crisp outline */}
      <path
        d={d}
        fill="none"
        stroke="var(--sp-accent)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Compact dollar formatting. Drop cents when the figure is large enough that
// cents are noise; keep two decimals at the low end so a wide-bet "$5.10"
// still reads as $5.10 (not $5).
function formatPayout(value: number): string {
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function SummaryCell({
  label,
  align = 'left',
  children,
}: {
  label: string;
  align?: 'left' | 'center' | 'right';
  children: React.ReactNode;
}) {
  return (
    <div style={{ textAlign: align, minWidth: 0 }}>
      <div className="sp-uppercase sp-secondary" style={{ marginBottom: '2px' }}>
        {label}
      </div>
      <div
        className="sp-display-md"
        style={{ fontSize: '20px', lineHeight: 1.15 }}
      >
        {children}
      </div>
    </div>
  );
}

function formatOutcome(value: number, decimals: number, units: string): string {
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return units ? `${formatted} ${units}` : formatted;
}

function PhaseHint({
  state,
  kicksTaken,
  shotType,
  aimOutcome,
}: {
  state: ReturnType<typeof useKickEngine>['state'];
  kicksTaken: number;
  shotType: ShotType;
  aimOutcome: string | null;
}) {
  const baseStyle = { fontSize: '12px', color: 'var(--sp-text-secondary)' };
  if (state === 'ready') {
    return (
      <span style={baseStyle}>
        {kicksTaken === 0
          ? "On the spot. Hit Kick when you're ready."
          : kicksTaken < ROUND_CONSTANTS.MAX_KICKS
            ? 'Stack another kick or lock it in.'
            : 'Five kicks down. Time to lock it in.'}
      </span>
    );
  }
  if (state === 'aiming') {
    return <span style={baseStyle}>Pick your spot. Tap Lock aim when the dot is where you want to score.</span>;
  }
  if (state === 'timing') {
    return (
      <span style={baseStyle}>
        Hit Lock at the apex for a clean {shotTypeNoun(shotType)}. Miss it and the kick sprays wider.
      </span>
    );
  }
  return null;
}

function shotTypeNoun(t: ShotType): string {
  switch (t) {
    case 'curl':
      return 'curl';
    case 'chip':
      return 'chip';
    case 'sweep':
      return 'sweep';
    default:
      return 'direct';
  }
}
