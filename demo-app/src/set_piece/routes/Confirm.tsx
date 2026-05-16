import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useAuth,
  useBuy,
  useConsensus,
  useMarket,
  usePreviewPayout,
} from '@functionspace/react';
import type { PayoutCurve } from '@functionspace/core';
import { PageShell } from '../components/PageShell';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Pill } from '../components/Pill';
import { MarketIcon } from '../components/MarketIcon';
import { AuthSheet } from '../components/AuthSheet';
import { Pitch } from '../game/Pitch';
import { useComposedBelief } from '../game/useComposedBelief';
import { useRound } from '../state/RoundContext';

export default function Confirm() {
  const navigate = useNavigate();
  const { marketId } = useParams<{ marketId: string }>();
  const { market } = useMarket(marketId ?? '');
  const { consensus } = useConsensus(marketId ?? '', 80);
  const round = useRound();
  const composed = useComposedBelief(market, round.kicks, 80);
  const { isAuthenticated, refreshUser } = useAuth();
  const buy = useBuy(marketId ?? '');
  const preview = usePreviewPayout(marketId ?? '');

  const [payout, setPayout] = useState<PayoutCurve | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [autoSubmit, setAutoSubmit] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  // If user arrives with no kicks, send them back to play.
  useEffect(() => {
    if (round.kicks.length === 0 && market) {
      navigate(`/m/${marketId}/play`, { replace: true });
    }
  }, [round.kicks.length, market, marketId, navigate]);

  // Debounced payout preview. Skipped for guests since the SDK rejects all
  // POSTs without a token; after sign-in the effect refires automatically.
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

  const submitBuy = useCallback(async () => {
    if (!composed) return;
    try {
      await buy.execute(composed.vector, round.stake);
      setCelebrating(true);
      // refresh wallet balance after the trade
      refreshUser().catch(() => {});
      setTimeout(() => {
        round.resetKicks();
        navigate('/calls');
      }, 1700);
    } catch {
      // buy.error is shown via the JSX
    }
  }, [composed, round, buy, navigate, refreshUser]);

  // After successful auth via the sheet, if we were trying to buy, retry
  useEffect(() => {
    if (isAuthenticated && autoSubmit) {
      setAutoSubmit(false);
      setAuthOpen(false);
      void submitBuy();
    }
  }, [isAuthenticated, autoSubmit, submitBuy]);

  const handleCta = () => {
    if (!isAuthenticated) {
      setAutoSubmit(true);
      setAuthOpen(true);
      return;
    }
    void submitBuy();
  };

  const ctaLabel = !composed
    ? 'No kicks yet'
    : !isAuthenticated
    ? 'Sign in to kick'
    : buy.loading
    ? 'Placing…'
    : 'GOAL!';

  const ctaDisabled =
    !composed || buy.loading || celebrating || (isAuthenticated && payoutLoading);

  return (
    <PageShell
      header={<Header onBack={() => navigate(-1)} centerLabel="Confirm" />}
      footer={
        <div>
          {buy.error && (
            <div
              style={{
                color: 'var(--sp-negative)',
                fontSize: '12px',
                marginBottom: '8px',
                textAlign: 'center',
              }}
            >
              {buy.error.message}
            </div>
          )}
          <Pill
            variant={isAuthenticated ? 'primary' : 'accent'}
            size="lg"
            fullWidth
            disabled={ctaDisabled}
            onClick={handleCta}
          >
            {ctaLabel}
          </Pill>
        </div>
      }
    >
      {/* Market summary */}
      {market && (
        <Card padding="md">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MarketIcon market={market} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="sp-uppercase sp-secondary"
                style={{ marginBottom: '2px' }}
              >
                Your call on
              </div>
              <div
                className="sp-display-md"
                style={{
                  fontSize: '16px',
                  lineHeight: 1.25,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical' as const,
                }}
              >
                {market.title}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Pitch in review mode */}
      <Card padding="none" tone="inset" radius="md" style={{ overflow: 'hidden' }}>
        {market && (
          <Pitch
            market={market}
            consensus={consensus}
            kicks={round.kicks}
            belief={composed?.curve ?? null}
          />
        )}
      </Card>

      {/* Belief + payout side by side */}
      {composed && market && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
          }}
        >
          <Card padding="md">
            <div className="sp-uppercase sp-secondary" style={{ marginBottom: '4px' }}>
              Your call
            </div>
            <div className="sp-display-md" style={{ fontSize: '22px' }}>
              <span className="sp-mono">
                ~
                {composed.stats.mean.toLocaleString(undefined, {
                  minimumFractionDigits: market.decimals ?? 0,
                  maximumFractionDigits: market.decimals ?? 0,
                })}
              </span>
            </div>
            <div className="sp-secondary" style={{ fontSize: '11px', marginTop: '4px' }}>
              ±{composed.stats.stdDev.toLocaleString(undefined, {
                minimumFractionDigits: market.decimals ?? 0,
                maximumFractionDigits: (market.decimals ?? 0) + 1,
              })} {market.xAxisUnits || ''}
            </div>
          </Card>

          <Card padding="md">
            <div className="sp-uppercase sp-secondary" style={{ marginBottom: '4px' }}>
              Best payout
            </div>
            {isAuthenticated ? (
              <>
                <div className="sp-display-md" style={{ fontSize: '22px' }}>
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
                <div className="sp-secondary" style={{ fontSize: '11px', marginTop: '4px' }}>
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
                    fontSize: '17px',
                    fontWeight: 600,
                    padding: 0,
                    lineHeight: 1.2,
                    textAlign: 'left',
                  }}
                >
                  Sign in to see →
                </button>
                <div className="sp-secondary" style={{ fontSize: '11px', marginTop: '4px' }}>
                  staking ${round.stake.toFixed(round.stake % 1 === 0 ? 0 : 2)}
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {/* Stake summary line */}
      <div
        className="sp-secondary"
        style={{
          fontSize: '12px',
          textAlign: 'center',
          padding: '0 8px',
        }}
      >
        Staking{' '}
        <span className="sp-mono" style={{ color: 'var(--sp-text)' }}>
          ${round.stake.toFixed(round.stake % 1 === 0 ? 0 : 2)}
        </span>{' '}
        across {round.kicks.length} kick{round.kicks.length === 1 ? '' : 's'}.{' '}
        {payout && (
          <>
            Max payout if you nail it:{' '}
            <span className="sp-mono" style={{ color: 'var(--sp-positive)' }}>
              ${payout.maxPayout.toFixed(2)}
            </span>
            .
          </>
        )}
      </div>

      {/* Auth sheet */}
      <AuthSheet
        open={authOpen}
        onClose={() => {
          setAuthOpen(false);
          setAutoSubmit(false);
        }}
        onLogin={() => {
          // The useEffect on isAuthenticated handles the retry — nothing to do here.
        }}
      />

      {/* GOAL celebration overlay */}
      <AnimatePresence>
        {celebrating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--sp-celebration-veil)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              zIndex: 200,
            }}
          >
            <motion.div
              initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
              animate={{ scale: 1, rotate: -4, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 28 }}
              className="sp-script"
              style={{
                fontSize: 'clamp(64px, 18vw, 120px)',
                color: 'var(--sp-positive)',
                textShadow: '0 4px 0 var(--sp-positive-shadow)',
                letterSpacing: '-0.02em',
              }}
            >
              GOOOAL!
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
