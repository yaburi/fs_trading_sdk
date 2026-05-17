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
          Step up.
          <br />
          Pick the World Cup
          <br />
          one kick at a time.
        </h1>
        <p
          className="sp-secondary"
          style={{
            fontSize: '15px',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Skip the sliders. Aim, time, kick — your shots become your call. Land it where the crowd isn't and the payout opens up.
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
  const rows = [
    { titleA: '78%', titleB: '52%', tagA: '64px', tagB: '78px' },
    { titleA: '68%', titleB: '40%', tagA: '64px', tagB: '54px' },
    { titleA: '82%', titleB: '60%', tagA: '64px', tagB: '88px' },
    { titleA: '60%', titleB: '34%', tagA: '64px', tagB: '0' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {rows.map((r, i) => (
        <Card key={i} padding="lg">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div
              className="sp-skeleton sp-skeleton-circle"
              style={{ width: '40px', height: '40px', flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="sp-skeleton"
                style={{ height: '14px', width: r.titleA, marginBottom: '8px' }}
              />
              <div
                className="sp-skeleton"
                style={{ height: '14px', width: r.titleB, marginBottom: '14px' }}
              />
              <div
                className="sp-skeleton"
                style={{ height: '10px', width: '42%', marginBottom: '12px' }}
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                <div
                  className="sp-skeleton sp-skeleton-pill"
                  style={{ height: '18px', width: r.tagA }}
                />
                {r.tagB !== '0' && (
                  <div
                    className="sp-skeleton sp-skeleton-pill"
                    style={{ height: '18px', width: r.tagB }}
                  />
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
