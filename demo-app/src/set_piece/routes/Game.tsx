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
import { TimingMeter } from '../game/TimingMeter';
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

  const primaryDisabled =
    !market ||
    kicksRemaining === 0 ||
    engine.state === 'flying' ||
    engine.state === 'landed';

  return (
    <PageShell
      header={<Header onBack={() => navigate(-1)} centerLabel="Free kick" />}
      footer={
        <div style={{ display: 'flex', gap: '8px' }}>
          <Pill
            variant="secondary"
            size="lg"
            fullWidth
            disabled={round.kicks.length === 0 || engine.state !== 'ready'}
            onClick={() => navigate(`/m/${marketId}/confirm`)}
          >
            Done · set belief
          </Pill>
          <Pill
            variant="primary"
            size="lg"
            fullWidth
            disabled={primaryDisabled}
            onClick={engine.primaryAction}
          >
            {kicksRemaining === 0 ? 'Out of kicks' : engine.primaryLabel}
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

      {/* Composed belief summary, appears after first kick.
       * Two columns: your call (mean + spread) on the left, best payout
       * (the headline figure) on the right. */}
      {composed && market && (
        <Card padding="md" tone="inset">
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div className="sp-uppercase sp-secondary" style={{ marginBottom: '2px' }}>
                Your call
              </div>
              <div className="sp-display-md" style={{ fontSize: '20px' }}>
                <span className="sp-mono">
                  ~
                  {composed.stats.mean.toLocaleString(undefined, {
                    minimumFractionDigits: market.decimals ?? 0,
                    maximumFractionDigits: market.decimals ?? 0,
                  })}
                </span>
                {market.xAxisUnits && (
                  <span
                    className="sp-secondary"
                    style={{ fontSize: '13px', marginLeft: '6px' }}
                  >
                    {market.xAxisUnits}
                  </span>
                )}
              </div>
              <div
                className="sp-secondary"
                style={{ fontSize: '11px', marginTop: '4px' }}
              >
                ±
                {composed.stats.stdDev.toLocaleString(undefined, {
                  minimumFractionDigits: market.decimals ?? 0,
                  maximumFractionDigits: (market.decimals ?? 0) + 1,
                })}
                {market.xAxisUnits ? ` ${market.xAxisUnits}` : ''} confidence
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div className="sp-uppercase sp-secondary" style={{ marginBottom: '2px' }}>
                Best payout
              </div>
              {isAuthenticated ? (
                <>
                  <div className="sp-display-md" style={{ fontSize: '20px' }}>
                    {payout ? (
                      <span className="sp-mono" style={{ color: 'var(--sp-positive)' }}>
                        ${payout.maxPayout.toFixed(2)}
                      </span>
                    ) : (
                      <span className="sp-secondary" style={{ fontSize: '14px' }}>
                        {payoutLoading ? 'previewing…' : '–'}
                      </span>
                    )}
                  </div>
                  <div
                    className="sp-secondary"
                    style={{ fontSize: '11px', marginTop: '4px' }}
                  >
                    {payout
                      ? `if outcome ≈ ${payout.maxPayoutOutcome.toLocaleString(undefined, {
                          minimumFractionDigits: market.decimals ?? 0,
                          maximumFractionDigits: market.decimals ?? 0,
                        })}`
                      : `staking $${round.stake.toFixed(round.stake % 1 === 0 ? 0 : 2)}`}
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setAuthOpen(true)}
                    style={{
                      color: 'var(--sp-accent)',
                      fontFamily: 'var(--sp-font-body)',
                      fontSize: '15px',
                      fontWeight: 600,
                      padding: 0,
                      lineHeight: 1.2,
                    }}
                  >
                    Sign in to see →
                  </button>
                  <div
                    className="sp-secondary"
                    style={{ fontSize: '11px', marginTop: '4px' }}
                  >
                    staking ${round.stake.toFixed(round.stake % 1 === 0 ? 0 : 2)}
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Timing meter (visible during the timing phase) */}
      {showTiming && (
        <Card padding="md" tone="inset">
          <TimingMeter
            phaseRef={engine.timingPhaseRef}
            sweetSpotCenter={engine.sweetSpot.center}
            sweetSpotHalfWidth={engine.sweetSpot.halfWidth}
            locked={engine.state === 'flying'}
          />
        </Card>
      )}

      <AuthSheet
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onLogin={() => setAuthOpen(false)}
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
          ? 'Step up. Tap Start kick when you\'re ready.'
          : kicksTaken < ROUND_CONSTANTS.MAX_KICKS
          ? 'Take another kick or finalize your belief.'
          : 'Max kicks taken. Finalize when ready.'}
      </span>
    );
  }
  if (state === 'aiming') {
    return <span style={baseStyle}>Watch the dot. Tap Lock aim where you want to score.</span>;
  }
  if (state === 'timing') {
    return (
      <span style={baseStyle}>
        Tap Lock timing inside the coral band for a tight kick.
        {aimOutcome ? ` Aim was ${aimOutcome}.` : ''}
      </span>
    );
  }
  if (state === 'flying') {
    return (
      <span style={{ ...baseStyle, fontStyle: 'italic' }}>The ball is in flight…</span>
    );
  }
  return null;
}
