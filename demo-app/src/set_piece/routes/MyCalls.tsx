import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAuth,
  useMarkets,
  usePositions,
  useSell,
} from '@functionspace/react';
import type { MarketState, Position } from '@functionspace/core';
import { PageShell } from '../components/PageShell';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Pill } from '../components/Pill';
import { MarketIcon } from '../components/MarketIcon';
import { AuthSheet } from '../components/AuthSheet';

type TabKey = 'open' | 'history';

export default function MyCalls() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { markets } = useMarkets({ categories: ['World Cup'] });
  const [authOpen, setAuthOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>('open');

  if (!isAuthenticated) {
    return (
      <PageShell header={<Header onBack={() => navigate('/')} centerLabel="My calls" />}>
        <Card>
          <div className="sp-display-md" style={{ fontSize: '20px', marginBottom: '6px' }}>
            Sign in to see your calls
          </div>
          <div className="sp-secondary" style={{ fontSize: '13px', marginBottom: '14px' }}>
            Your open positions and trade history will live here. We never ask for an email.
          </div>
          <Pill variant="accent" size="md" onClick={() => setAuthOpen(true)}>
            Sign in
          </Pill>
        </Card>
        <AuthSheet
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          onLogin={() => setAuthOpen(false)}
        />
      </PageShell>
    );
  }

  return (
    <PageShell header={<Header onBack={() => navigate('/')} centerLabel="My calls" />}>
      {/* Tab bar */}
      <div
        style={{
          display: 'inline-flex',
          padding: '4px',
          gap: '2px',
          background: 'var(--sp-surface-2)',
          borderRadius: 'var(--sp-radius-pill)',
          border: '1px solid var(--sp-border-subtle)',
          alignSelf: 'flex-start',
        }}
      >
        <TabButton active={tab === 'open'} onClick={() => setTab('open')}>
          Open
        </TabButton>
        <TabButton active={tab === 'history'} onClick={() => setTab('history')}>
          History
        </TabButton>
      </div>

      <PositionsList
        markets={markets}
        username={user?.username ?? ''}
        tab={tab}
        onPickMarket={(id) => navigate(`/m/${id}/stake`)}
      />
    </PageShell>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 16px',
        borderRadius: '999px',
        background: active ? 'var(--sp-surface)' : 'transparent',
        color: active ? 'var(--sp-text)' : 'var(--sp-text-secondary)',
        fontWeight: 600,
        fontSize: '13px',
        boxShadow: active ? '0 1px 2px rgb(0 0 0 / 0.06)' : 'none',
        cursor: 'pointer',
        transition: 'background 0.15s var(--sp-ease)',
      }}
    >
      {children}
    </button>
  );
}

function PositionsList({
  markets,
  username,
  tab,
  onPickMarket,
}: {
  markets: MarketState[];
  username: string;
  tab: TabKey;
  onPickMarket: (id: string | number) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {markets.length === 0 ? (
        <Card>
          <div className="sp-secondary" style={{ fontSize: '13px' }}>
            Loading markets…
          </div>
        </Card>
      ) : (
        markets.map((m) => (
          <MarketPositionsBlock
            key={m.marketId}
            market={m}
            username={username}
            tab={tab}
            onPickMarket={onPickMarket}
          />
        ))
      )}
      {markets.length > 0 && (
        <EmptyAcrossAllHint markets={markets} username={username} tab={tab} onPickMarket={onPickMarket} />
      )}
    </div>
  );
}

/**
 * Per-market block. Renders nothing if the user has no positions in this
 * market matching the active tab.
 */
function MarketPositionsBlock({
  market,
  username,
  tab,
  onPickMarket,
}: {
  market: MarketState;
  username: string;
  tab: TabKey;
  onPickMarket: (id: string | number) => void;
}) {
  const { positions, loading } = usePositions(market.marketId, username, {
    pollInterval: 8000,
  });

  const filtered = useMemo(() => {
    if (!positions) return [];
    return tab === 'open'
      ? positions.filter((p) => p.status === 'open')
      : positions.filter((p) => p.status !== 'open');
  }, [positions, tab]);

  if (loading || filtered.length === 0) return null;

  return (
    <Card padding="md">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '12px',
        }}
      >
        <MarketIcon market={market} size={36} />
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
            {market.title}
          </div>
          <div
            className="sp-secondary"
            style={{ fontSize: '11px', marginTop: '2px' }}
          >
            {filtered.length} {filtered.length === 1 ? 'position' : 'positions'}
          </div>
        </div>
        <button
          onClick={() => onPickMarket(market.marketId)}
          style={{
            padding: '6px 12px',
            borderRadius: '999px',
            border: '1px solid var(--sp-border)',
            background: 'var(--sp-surface)',
            fontSize: '12px',
            color: 'var(--sp-text-secondary)',
            fontWeight: 500,
          }}
        >
          Add kick →
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.map((p) => (
          <PositionRow key={String(p.positionId)} market={market} position={p} tab={tab} />
        ))}
      </div>
    </Card>
  );
}

function PositionRow({
  market,
  position,
  tab,
}: {
  market: MarketState;
  position: Position;
  tab: TabKey;
}) {
  const sell = useSell(market.marketId);
  const decimals = market.decimals ?? 0;
  const formatOutcome = (n: number) =>
    n.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  const handleSell = async () => {
    try {
      await sell.execute(position.positionId);
    } catch {
      /* error rendered below */
    }
  };

  return (
    <div
      style={{
        background: 'var(--sp-surface-2)',
        border: '1px solid var(--sp-border-subtle)',
        borderRadius: 'var(--sp-radius-md)',
        padding: '12px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sp-uppercase sp-secondary" style={{ marginBottom: '2px' }}>
            {tab === 'open' ? 'Open · staked' : 'Closed'}
          </div>
          <div className="sp-display-md" style={{ fontSize: '18px' }}>
            <span className="sp-mono">${position.collateral.toFixed(2)}</span>
          </div>
          <div
            className="sp-secondary"
            style={{ fontSize: '11px', marginTop: '2px' }}
          >
            {position.prediction != null && (
              <>
                aim: <span className="sp-mono" style={{ color: 'var(--sp-text)' }}>
                  {formatOutcome(position.prediction)}
                </span>{' '}
                ·{' '}
              </>
            )}
            claims: <span className="sp-mono">{position.claims.toFixed(2)}</span>
          </div>
        </div>

        {tab === 'open' ? (
          <Pill
            variant="secondary"
            size="sm"
            disabled={sell.loading}
            onClick={handleSell}
          >
            {sell.loading ? 'Selling…' : 'Sell'}
          </Pill>
        ) : (
          <div style={{ textAlign: 'right' }}>
            <div className="sp-uppercase sp-secondary">Returned</div>
            <div className="sp-mono" style={{ fontSize: '13px' }}>
              {position.soldPrice != null ? `$${position.soldPrice.toFixed(2)}` : '—'}
            </div>
          </div>
        )}
      </div>
      {sell.error && (
        <div
          style={{
            color: 'var(--sp-negative)',
            fontSize: '11px',
            marginTop: '8px',
          }}
        >
          {sell.error.message}
        </div>
      )}
    </div>
  );
}

/**
 * Shows an empty-state card only if EVERY market reports zero matching
 * positions. Uses the same per-market hook chain so the cache key matches.
 */
function EmptyAcrossAllHint({
  markets,
  tab,
  onPickMarket,
}: {
  markets: MarketState[];
  username: string;
  tab: TabKey;
  onPickMarket: (id: string | number) => void;
}) {
  // We can't know "all empty" without hook calls; render an unobtrusive footer hint
  // that appears below the per-market blocks. When at least one block renders, this
  // hint feels redundant but stays harmless. When no blocks render, it acts as the
  // empty state.
  return (
    <Card tone="inset" padding="md">
      <div className="sp-secondary" style={{ fontSize: '13px', lineHeight: 1.5 }}>
        {tab === 'open' ? (
          <>
            Open positions show up here as soon as a kick lands.{' '}
            {markets.length > 0 && (
              <button
                onClick={() => onPickMarket(markets[0].marketId)}
                style={{
                  color: 'var(--sp-accent)',
                  background: 'transparent',
                  padding: 0,
                  fontWeight: 600,
                }}
              >
                Pick a market →
              </button>
            )}
          </>
        ) : (
          <>Closed positions and historical kicks will show up here once they settle.</>
        )}
      </div>
    </Card>
  );
}
