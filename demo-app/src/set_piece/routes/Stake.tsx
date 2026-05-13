import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth, useMarket } from '@functionspace/react';
import { PageShell } from '../components/PageShell';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Pill } from '../components/Pill';
import { MarketIcon } from '../components/MarketIcon';
import { useRound } from '../state/RoundContext';

const HARD_CAP = 100;
const STEP = 0.5;
const QUICK_PICKS = [1, 5, 10, 25];

export default function Stake() {
  const navigate = useNavigate();
  const { marketId } = useParams<{ marketId: string }>();
  const { market, loading } = useMarket(marketId ?? '');
  const { user, isAuthenticated } = useAuth();
  const { stake, setStake, startRound } = useRound();

  // Initialize round state when this screen mounts for a market.
  useEffect(() => {
    if (marketId) startRound(marketId);
  }, [marketId, startRound]);

  const walletMax = useMemo(() => {
    if (isAuthenticated && user) {
      return Math.max(1, Math.min(HARD_CAP, Math.floor(user.walletValue)));
    }
    return HARD_CAP;
  }, [isAuthenticated, user]);

  const consensusHint = useMemo(() => {
    if (!market) return null;
    const mean = market.consensusMean;
    if (mean == null || !isFinite(mean)) return null;
    const decimals = market.decimals ?? 0;
    return mean.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }, [market]);

  const handlePick = (value: number) => setStake(Math.min(value, walletMax));
  const handleMax = () => setStake(walletMax);
  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) =>
    setStake(Number(e.target.value));

  const handleContinue = () => navigate(`/m/${marketId}/play`);

  return (
    <PageShell
      header={<Header onBack={() => navigate(-1)} centerLabel="Stake" />}
      footer={
        <Pill
          variant="primary"
          size="lg"
          fullWidth
          disabled={!market || loading}
          onClick={handleContinue}
        >
          Start kicking →
        </Pill>
      }
    >
      {/* Market summary */}
      <Card padding="lg">
        {loading || !market ? (
          <SkeletonMarket />
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <MarketIcon market={market} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sp-uppercase sp-secondary" style={{ marginBottom: '6px' }}>
                You're betting on
              </div>
              <div
                className="sp-display-md"
                style={{ fontSize: '20px', lineHeight: 1.25, marginBottom: '10px' }}
              >
                {market.title}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '12px',
                  fontSize: '13px',
                  color: 'var(--sp-text-secondary)',
                  flexWrap: 'wrap',
                }}
              >
                <span>
                  Range:{' '}
                  <span className="sp-mono" style={{ color: 'var(--sp-text)' }}>
                    {market.config.lowerBound} – {market.config.upperBound}
                  </span>
                  {market.xAxisUnits && (
                    <span className="sp-secondary"> {market.xAxisUnits}</span>
                  )}
                </span>
                {consensusHint && (
                  <span>
                    Crowd expects ~
                    <span className="sp-mono" style={{ color: 'var(--sp-text)' }}>
                      {consensusHint}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Stake selection */}
      <Card padding="lg">
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: '14px',
          }}
        >
          <div className="sp-uppercase sp-secondary">Your stake</div>
          {isAuthenticated && user ? (
            <div className="sp-mono sp-secondary" style={{ fontSize: '11px' }}>
              wallet ${user.walletValue.toFixed(2)}
            </div>
          ) : (
            <div className="sp-secondary" style={{ fontSize: '11px' }}>
              capped at ${HARD_CAP} as guest
            </div>
          )}
        </div>

        {/* Big number */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'center',
            gap: '4px',
            margin: '6px 0 18px',
          }}
        >
          <span
            className="sp-display"
            style={{
              fontSize: '20px',
              color: 'var(--sp-text-secondary)',
              fontWeight: 700,
            }}
          >
            $
          </span>
          <span
            className="sp-display"
            style={{
              fontFamily: 'var(--sp-font-mono)',
              fontSize: '64px',
              letterSpacing: '-0.04em',
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {stake.toFixed(stake % 1 === 0 ? 0 : 2)}
          </span>
        </div>

        {/* Slider */}
        <input
          type="range"
          min={1}
          max={walletMax}
          step={STEP}
          value={stake}
          onChange={handleSlider}
          className="sp-stake-slider"
          aria-label="Stake amount"
          style={
            {
              '--sp-fill': `${((stake - 1) / (walletMax - 1)) * 100}%`,
            } as React.CSSProperties
          }
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '6px',
            fontSize: '11px',
            color: 'var(--sp-text-muted)',
          }}
        >
          <span className="sp-mono">$1</span>
          <span className="sp-mono">${walletMax}</span>
        </div>

        {/* Quick picks */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '6px',
            marginTop: '16px',
          }}
        >
          {QUICK_PICKS.map((value) => {
            const active = Math.round(stake) === value;
            return (
              <button
                key={value}
                onClick={() => handlePick(value)}
                disabled={value > walletMax}
                style={{
                  padding: '8px 0',
                  borderRadius: 'var(--sp-radius-pill)',
                  border: '1px solid var(--sp-border)',
                  background: active ? 'var(--sp-primary)' : 'var(--sp-surface)',
                  color: active ? '#FFFFFF' : 'var(--sp-text)',
                  fontSize: '13px',
                  fontWeight: 600,
                  fontFamily: 'var(--sp-font-mono)',
                  cursor: value > walletMax ? 'not-allowed' : 'pointer',
                  opacity: value > walletMax ? 0.4 : 1,
                  transition: 'all 0.15s var(--sp-ease)',
                }}
              >
                ${value}
              </button>
            );
          })}
          <button
            onClick={handleMax}
            style={{
              padding: '8px 0',
              borderRadius: 'var(--sp-radius-pill)',
              border: '1px solid var(--sp-border)',
              background:
                Math.round(stake) === walletMax ? 'var(--sp-primary)' : 'var(--sp-surface)',
              color: Math.round(stake) === walletMax ? '#FFFFFF' : 'var(--sp-text)',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              transition: 'all 0.15s var(--sp-ease)',
            }}
          >
            MAX
          </button>
        </div>
      </Card>

      {/* Helper note */}
      <div
        className="sp-secondary"
        style={{
          fontSize: '12px',
          textAlign: 'center',
          lineHeight: 1.5,
          padding: '0 8px',
        }}
      >
        You'll take 1 to 5 kicks. Each kick adds a region to your belief.
        Aim where the keeper is faded for a bigger potential payout.
      </div>
    </PageShell>
  );
}

function SkeletonMarket() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '999px',
          background: 'var(--sp-surface-2)',
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1 }}>
        <div
          style={{
            height: '12px',
            width: '80px',
            background: 'var(--sp-surface-2)',
            borderRadius: '4px',
            marginBottom: '10px',
          }}
        />
        <div
          style={{
            height: '14px',
            width: '90%',
            background: 'var(--sp-surface-2)',
            borderRadius: '4px',
            marginBottom: '6px',
          }}
        />
        <div
          style={{
            height: '14px',
            width: '60%',
            background: 'var(--sp-surface-2)',
            borderRadius: '4px',
          }}
        />
      </div>
    </div>
  );
}
