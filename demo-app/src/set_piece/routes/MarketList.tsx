import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarkets } from '@functionspace/react';
import { PageShell } from '../components/PageShell';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { MarketRow } from '../components/MarketRow';
import { IntroSheet } from '../components/IntroSheet';

type ScopeId = 'wc' | 'all';

export default function MarketList() {
  const navigate = useNavigate();
  // Default to the World Cup slice but let the user widen the list to
  // every open market. Stored as local state so toggling is instant; no
  // need to persist across navigations -- defaulting back to World Cup on
  // re-entry matches the marketed positioning of the app.
  const [scope, setScope] = useState<ScopeId>('wc');
  const { markets, loading, error, refetch } = useMarkets({
    categories: scope === 'wc' ? ['World Cup'] : undefined,
    state: 'open',
    sortBy: 'totalVolume',
    sortOrder: 'desc',
  });

  return (
    <PageShell header={<Header />}>
      <IntroSheet />
      <div>
        <h1
          className="sp-display"
          style={{
            fontSize: '34px',
            margin: 0,
            marginBottom: '8px',
            letterSpacing: '-0.03em',
          }}
        >
          Predict the World Cup,
          <br />
          one free kick at a time.
        </h1>
        <p
          className="sp-secondary"
          style={{
            fontSize: '15px',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Pick a market. Aim, time, kick. Each kick shapes your prediction. Going against the crowd pays more when you're right.
        </p>
      </div>

      {loading && <SkeletonList />}

      {error && (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="sp-display-md" style={{ fontSize: '18px' }}>
              Couldn't load markets
            </div>
            <div className="sp-secondary" style={{ fontSize: '14px' }}>
              {error.message}
            </div>
            <button
              onClick={() => refetch()}
              style={{
                marginTop: '8px',
                alignSelf: 'flex-start',
                padding: '8px 16px',
                borderRadius: '999px',
                background: 'var(--sp-primary)',
                color: 'var(--sp-on-primary)',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              Try again
            </button>
          </div>
        </Card>
      )}

      {!loading && !error && (
        <ScopeToggle value={scope} onChange={setScope} />
      )}

      {!loading && !error && markets.length === 0 && (
        <Card>
          <div className="sp-display-md" style={{ fontSize: '18px', marginBottom: '4px' }}>
            {scope === 'wc' ? 'No World Cup markets right now' : 'No open markets right now'}
          </div>
          <div className="sp-secondary" style={{ fontSize: '14px' }}>
            {scope === 'wc'
              ? 'Try All markets, or check back closer to kickoff.'
              : 'Check back soon.'}
          </div>
        </Card>
      )}

      {!loading && !error && markets.length > 0 && (
        <>
          <div
            className="sp-uppercase sp-secondary"
            style={{ marginTop: '8px', marginBottom: '-8px' }}
          >
            {markets.length} {markets.length === 1 ? 'market' : 'markets'} open
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {markets.map((market) => (
              <MarketRow
                key={market.marketId}
                market={market}
                onClick={() => navigate(`/m/${market.marketId}/stake`)}
              />
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}

function ScopeToggle({
  value,
  onChange,
}: {
  value: ScopeId;
  onChange: (v: ScopeId) => void;
}) {
  const tabs: { id: ScopeId; label: string }[] = [
    { id: 'wc', label: 'World Cup' },
    { id: 'all', label: 'All markets' },
  ];
  return (
    <div
      role="tablist"
      aria-label="Market scope"
      style={{
        display: 'inline-flex',
        padding: '4px',
        borderRadius: '999px',
        background: 'var(--sp-surface)',
        border: '1px solid var(--sp-border)',
        alignSelf: 'flex-start',
        gap: '2px',
      }}
    >
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              background: active ? 'var(--sp-primary)' : 'transparent',
              color: active ? 'var(--sp-on-primary)' : 'var(--sp-text-secondary)',
              fontSize: '12px',
              fontWeight: 600,
              transition: 'background 0.18s var(--sp-ease), color 0.18s var(--sp-ease)',
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function SkeletonList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[0, 1, 2, 3].map((i) => (
        <Card key={i}>
          <div
            style={{
              height: '14px',
              width: '70%',
              background: 'var(--sp-surface-2)',
              borderRadius: '4px',
              marginBottom: '8px',
            }}
          />
          <div
            style={{
              height: '14px',
              width: '45%',
              background: 'var(--sp-surface-2)',
              borderRadius: '4px',
              marginBottom: '14px',
            }}
          />
          <div style={{ display: 'flex', gap: '6px' }}>
            <div
              style={{
                height: '18px',
                width: '60px',
                background: 'var(--sp-surface-2)',
                borderRadius: '999px',
              }}
            />
            <div
              style={{
                height: '18px',
                width: '70px',
                background: 'var(--sp-surface-2)',
                borderRadius: '999px',
              }}
            />
          </div>
        </Card>
      ))}
    </div>
  );
}
