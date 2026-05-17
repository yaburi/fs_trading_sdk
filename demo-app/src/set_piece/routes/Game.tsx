import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth, useConsensus, useMarket, usePreviewPayout } from '@functionspace/react';
import type { PayoutCurve } from '@functionspace/core';
import { PageShell } from '../components/PageShell';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Pill } from '../components/Pill';
import { MarketIcon } from '../components/MarketIcon';
import { AuthSheet } from '../components/AuthSheet';
import { Pitch } from '../game/Pitch';
import { useKickEngine } from '../game/useKickEngine';
import { WindChip } from '../game/WindChip';
import { useComposedBelief } from '../game/useComposedBelief';
import { useRound, ROUND_CONSTANTS } from '../state/RoundContext';

export default function Game() {
  const navigate = useNavigate();
  const { marketId } = useParams<{ marketId: string }>();
  const { market } = useMarket(marketId ?? '');
  const { consensus } = useConsensus(marketId ?? '', 80);
  const round = useRound();
  const engine = useKickEngine(market);
  const composed = useComposedBelief(market, round.kicks, 80);
  const kicksRemaining = ROUND_CONSTANTS.MAX_KICKS - round.kicks.length;
  const { isAuthenticated } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  // After guest taps Submit, sign-in success advances them to /confirm.
  useEffect(() => {
    if (isAuthenticated && pendingSubmit) {
      setPendingSubmit(false);
      setAuthOpen(false);
      navigate(`/m/${marketId}/confirm`);
    }
  }, [isAuthenticated, pendingSubmit, marketId, navigate]);

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

  const showWindChip = engine.state !== 'ready' || round.kicks.length > 0;
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
    // belief PDF. evaluateDensityCurve returns a normalized density so the
    // result is the expectation directly -- no further scaling.
    const pts = composed.curve.points;
    let expected = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const ga = payoutAt(a.x) * a.y;
      const gb = payoutAt(b.x) * b.y;
      expected += ((ga + gb) / 2) * (b.x - a.x);
    }

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

  const canFinalize = round.kicks.length > 0 && engine.state === 'ready';
  const handleSubmit = () => {
    if (!canFinalize) return;
    if (!isAuthenticated) {
      setPendingSubmit(true);
      setAuthOpen(true);
      return;
    }
    navigate(`/m/${marketId}/confirm`);
  };
  const handleClear = () => {
    if (!canFinalize) return;
    round.resetKicks();
  };

  return (
    <PageShell
      header={<Header onBack={() => navigate(-1)} centerLabel="Free kick" />}
      footer={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

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
              Submit
            </Pill>
          </div>

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
        </div>
      }
    >
      {/* Market + stake + wind strip */}
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginTop: '4px',
                fontSize: '11px',
                color: 'var(--sp-text-secondary)',
              }}
            >
              <span className="sp-mono">${round.stake.toFixed(round.stake % 1 === 0 ? 0 : 2)}</span>
              <span>·</span>
              <KickDots taken={round.kicks.length} total={ROUND_CONSTANTS.MAX_KICKS} />
            </div>
          </div>
          {showWindChip && <WindChip wind={engine.wind} muted={engine.state === 'ready'} />}
        </div>
      </Card>

      {/* Game canvas */}
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

      {/* Bet summary, appears after first kick. Three figures across the card:
       *   STAKE  ·  EXPECTED (probability-weighted under your belief)  ·  BEST CASE
       * with a "if the crowd is right" anchor underneath. The user's belief
       * shape is shown on the pitch above; we don't try to summarise it as a
       * Gaussian (mean ± σ) here -- that lies for multimodal kicks. */}
      {composed && market && (
        <Card padding="md" tone="inset">
          {isAuthenticated ? (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '10px',
                  alignItems: 'flex-start',
                }}
              >
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
                  aligned with the crowd
                </div>
              )}
            </>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
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
                style={{
                  color: 'var(--sp-accent)',
                  fontFamily: 'var(--sp-font-body)',
                  fontSize: '14px',
                  fontWeight: 600,
                  padding: 0,
                  lineHeight: 1.2,
                }}
              >
                Sign in to see payouts →
              </button>
            </div>
          )}
        </Card>
      )}

      <AuthSheet
        open={authOpen}
        onClose={() => {
          setAuthOpen(false);
          setPendingSubmit(false);
        }}
      />
    </PageShell>
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
  aimOutcome,
}: {
  state: ReturnType<typeof useKickEngine>['state'];
  kicksTaken: number;
  aimOutcome: string | null;
}) {
  const baseStyle = { fontSize: '13px', color: 'var(--sp-text-secondary)' };
  if (state === 'ready') {
    return (
      <span style={baseStyle}>
        {kicksTaken === 0
          ? 'Step up. Tap Kick when you\'re ready.'
          : kicksTaken < ROUND_CONSTANTS.MAX_KICKS
            ? 'Take another kick or submit your belief.'
            : 'Max kicks taken. Submit when ready.'}
      </span>
    );
  }
  if (state === 'aiming') {
    return <span style={baseStyle}>Watch the dot. Tap Lock aim where you want to score.</span>;
  }
  if (state === 'timing') {
    return (
      <span style={baseStyle}>
        Tap Lock when the meter reaches the green zone at the top.
      </span>
    );
  }
  return null;
}
