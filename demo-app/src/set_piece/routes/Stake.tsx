import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth, useMarket } from '@functionspace/react';
import { PageShell } from '../components/PageShell';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Pill } from '../components/Pill';
import { MarketIcon } from '../components/MarketIcon';
import { useRound } from '../state/RoundContext';

const HARD_CAP = 100;
const MIN_STAKE = 1;
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

  const handlePick = (value: number) => {
    const next = Math.min(value, walletMax);
    setStake(next);
    setDraft(formatStake(next));
  };
  const handleMax = () => {
    setStake(walletMax);
    setDraft(formatStake(walletMax));
  };

  // Local editable text so users can clear/retype freely without the
  // committed stake jumping around as they type.
  const [draft, setDraft] = useState(() => formatStake(stake));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    // collapse multiple dots
    const parts = raw.split('.');
    const cleaned = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : raw;
    setDraft(cleaned);
    const parsed = Number(cleaned);
    if (cleaned !== '' && Number.isFinite(parsed)) {
      setStake(Math.min(walletMax, Math.max(MIN_STAKE, parsed)));
    }
  };
  const handleInputBlur = () => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed) || draft === '') {
      setStake(MIN_STAKE);
      setDraft(formatStake(MIN_STAKE));
      return;
    }
    const clamped = Math.min(walletMax, Math.max(MIN_STAKE, parsed));
    setStake(clamped);
    setDraft(formatStake(clamped));
  };
  const handleClear = () => {
    setDraft('');
    setStake(MIN_STAKE);
  };

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
                  Range{' '}
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
              Wallet ${user.walletValue.toFixed(2)}
            </div>
          ) : (
            <div className="sp-secondary" style={{ fontSize: '11px' }}>
              Capped at ${HARD_CAP} as guest
            </div>
          )}
        </div>

        {/* Editable stake input */}
        <label
          className="sp-stake-field"
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            width: '100%',
            margin: '6px 0 18px',
            padding: '18px 56px',
            background: 'var(--sp-surface-2)',
            border: '1px solid var(--sp-border)',
            borderRadius: 'var(--sp-radius-md)',
            cursor: 'text',
            overflow: 'hidden',
            transition: 'border-color 0.15s var(--sp-ease), box-shadow 0.15s var(--sp-ease)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--sp-font-mono)',
              fontSize: '32px',
              color: 'var(--sp-text-muted)',
              fontWeight: 500,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            $
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={draft}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Stake amount"
            style={{
              fontFamily: 'var(--sp-font-mono)',
              fontSize: '48px',
              letterSpacing: '-0.03em',
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
              width: `${Math.max(1, draft.length)}ch`,
              maxWidth: '100%',
              minWidth: 0,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--sp-text)',
              padding: 0,
              textAlign: 'left',
            }}
          />
          {draft.length > 0 && (
            <button
              type="button"
              aria-label="Clear stake"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleClear}
              className="sp-stake-clear"
              style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '22px',
                height: '22px',
                borderRadius: '999px',
                background: 'var(--sp-text-muted)',
                color: 'var(--sp-surface)',
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                cursor: 'pointer',
                opacity: 0.5,
                transition: 'opacity 0.15s var(--sp-ease)',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <path
                  d="M2 2 L8 8 M8 2 L2 8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </label>

        {/* Quick picks */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '6px',
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
                  color: active ? 'var(--sp-on-primary)' : 'var(--sp-text)',
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
              color: Math.round(stake) === walletMax ? 'var(--sp-on-primary)' : 'var(--sp-text)',
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
        You'll take 1 to 5 kicks. Each kick adds to your prediction.
        Aim where the crowd isn't for a bigger potential payout.
      </div>
    </PageShell>
  );
}

function formatStake(value: number): string {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
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
