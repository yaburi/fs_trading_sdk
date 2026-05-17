import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAuth,
  useMarkets,
  usePositions,
  usePreviewSell,
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
  const { markets, loading: marketsLoading } = useMarkets({ categories: ['World Cup'] });
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
            Open positions and call history go here. No email needed.
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
        marketsLoading={marketsLoading}
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
      className={active ? 'sp-tap' : 'sp-tap sp-tap-chip'}
      style={{
        padding: '6px 16px',
        borderRadius: '999px',
        background: active ? 'var(--sp-primary)' : 'transparent',
        color: active ? 'var(--sp-on-primary)' : 'var(--sp-text-secondary)',
        fontWeight: 600,
        fontSize: '13px',
        boxShadow: active ? '0 1px 2px rgb(0 0 0 / 0.06)' : 'none',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function PositionsList({
  markets,
  marketsLoading,
  username,
  tab,
  onPickMarket,
}: {
  markets: MarketState[];
  marketsLoading: boolean;
  username: string;
  tab: TabKey;
  onPickMarket: (id: string | number) => void;
}) {
  // Per-market filtered position counts, populated as each block loads.
  // We deliberately do NOT reset on tab change: parent useEffects fire after
  // child useEffects, so a reset here would clobber the child onCount updates
  // that have already queued for the new tab, leaving counts permanently
  // empty and the skeleton stuck. Each block re-fires its effect when its
  // filtered.length changes across tabs, so stale values get overwritten.
  const [counts, setCounts] = useState<Record<string, number>>({});
  const handleCount = useCallback((marketId: string | number, count: number) => {
    setCounts((prev) => {
      const key = String(marketId);
      if (prev[key] === count) return prev;
      return { ...prev, [key]: count };
    });
  }, []);

  // "Loaded" means the markets list has resolved AND every per-market block
  // has reported its count. With zero markets there's nothing to wait on, so
  // allLoaded flips true the moment marketsLoading turns false.
  const allLoaded = !marketsLoading && Object.keys(counts).length >= markets.length;
  const hasAny = Object.values(counts).some((c) => c > 0);
  const showEmpty = allLoaded && !hasAny;
  // Keep skeletons up while we don't yet know what to render: markets list
  // still resolving, or markets in but no block has rendered or reported yet.
  // Falls through to showEmpty or real blocks the moment we know.
  const showTopLevelSkeleton =
    marketsLoading || (markets.length > 0 && !allLoaded && !hasAny);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {showTopLevelSkeleton && (
        <>
          <PositionBlockSkeleton positions={2} />
          <PositionBlockSkeleton positions={1} />
        </>
      )}
      {/* Real blocks mount even while skeletons are visible so the per-market
       * usePositions queries fire and report their counts back up. Each block
       * stays null until it has real content, so they sit behind the skeletons
       * and reveal themselves as the data lands. */}
      {markets.map((m) => (
        <MarketPositionsBlock
          key={m.marketId}
          market={m}
          username={username}
          tab={tab}
          onPickMarket={onPickMarket}
          onCount={handleCount}
        />
      ))}
      {showEmpty && (
        <EmptyAcrossAllHint tab={tab} />
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
  onCount,
}: {
  market: MarketState;
  username: string;
  tab: TabKey;
  onPickMarket: (id: string | number) => void;
  onCount: (marketId: string | number, count: number) => void;
}) {
  const { positions, loading, error } = usePositions(market.marketId, username, {
    pollInterval: 20000,
  });

  const filtered = useMemo(() => {
    if (!positions) return [];
    return tab === 'open'
      ? positions.filter((p) => p.status === 'open')
      : positions.filter((p) => p.status !== 'open');
  }, [positions, tab]);

  // Report count to parent once we have a definitive answer: a populated
  // positions array OR an error. Loading is false in this hook even before
  // a fetch has kicked off (status='idle' with data=null), so guarding on
  // !loading alone would briefly report 0 for every block and flash the
  // empty state before real data arrives.
  const hasResult = positions != null || error != null;
  useEffect(() => {
    if (loading || !hasResult) return;
    onCount(market.marketId, filtered.length);
  }, [loading, hasResult, filtered.length, market.marketId, onCount]);

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
          className="sp-tap sp-tap-surface"
          style={{
            padding: '6px 12px',
            borderRadius: '999px',
            border: '1px solid var(--sp-border)',
            background: 'var(--sp-surface)',
            fontSize: '12px',
            color: 'var(--sp-text-secondary)',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          View Market →
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
  const previewSell = usePreviewSell(market.marketId);
  const decimals = market.decimals ?? 0;
  const formatOutcome = (n: number) =>
    n.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  // Live cash-out preview for open positions. The raw `claims` number is an
  // internal accounting unit that reads like dollars but isn't, so we show
  // the actual sell payout instead. previewSell.execute is imperative; we
  // fire it once per position and abort on unmount.
  const [cashOut, setCashOut] = useState<number | null>(null);
  useEffect(() => {
    if (position.status !== 'open') return;
    const controller = new AbortController();
    previewSell
      .execute(position.positionId as unknown as number, {
        signal: controller.signal,
      })
      .then((res) => setCashOut(res.collateralReturned))
      .catch(() => {
        /* keep cashOut null on error; row degrades gracefully */
      });
    return () => controller.abort();
    // execute is stable per marketId; positionId is the unit of work.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position.positionId, position.status]);

  const handleSell = async () => {
    try {
      // SDK type quirk: useSell.execute is typed number, but the underlying
      // sell() accepts string|number and the API can return either. Coercing
      // with Number() NaNs on non-numeric ids, so pass through as-is.
      await sell.execute(position.positionId as unknown as number);
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
                </span>
                {tab === 'open' && <> · </>}
              </>
            )}
            {tab === 'open' && (
              <>
                cash out:{' '}
                <span className="sp-mono" style={{ color: 'var(--sp-text)' }}>
                  {cashOut != null ? `$${cashOut.toFixed(2)}` : '…'}
                </span>
              </>
            )}
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
              {position.soldPrice != null ? `$${position.soldPrice.toFixed(2)}` : '–'}
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

/** Empty-state card, only rendered when every market has reported zero
 * matching positions for the active tab. */
function EmptyAcrossAllHint({ tab }: { tab: TabKey }) {
  const navigate = useNavigate();
  return (
    <Card tone="inset" padding="md">
      <div className="sp-secondary" style={{ fontSize: '13px', lineHeight: 1.5 }}>
        {tab === 'open' ? (
          <>
            Open positions show up here as soon as a kick lands.{' '}
            <button
              onClick={() => navigate('/')}
              className="sp-tap sp-tap-link"
              style={{
                color: 'var(--sp-accent)',
                background: 'transparent',
                padding: 0,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Pick a market →
            </button>
          </>
        ) : (
          <>Closed positions appear here once they settle.</>
        )}
      </div>
    </Card>
  );
}

/** Skeleton placeholder mirroring MarketPositionsBlock: header row with icon,
 * title, and trailing button, followed by N inset position rows. */
function PositionBlockSkeleton({ positions = 2 }: { positions?: number }) {
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
        <div
          className="sp-skeleton sp-skeleton-circle"
          style={{ width: '36px', height: '36px', flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="sp-skeleton"
            style={{ height: '12px', width: '80%', marginBottom: '6px' }}
          />
          <div
            className="sp-skeleton"
            style={{ height: '10px', width: '32%' }}
          />
        </div>
        <div
          className="sp-skeleton sp-skeleton-pill"
          style={{ width: '84px', height: '26px', flexShrink: 0 }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {Array.from({ length: positions }).map((_, i) => (
          <PositionRowSkeleton key={i} />
        ))}
      </div>
    </Card>
  );
}

function PositionRowSkeleton() {
  return (
    <div
      style={{
        background: 'var(--sp-surface-2)',
        border: '1px solid var(--sp-border-subtle)',
        borderRadius: 'var(--sp-radius-md)',
        padding: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="sp-skeleton"
          style={{ height: '8px', width: '38%', marginBottom: '6px' }}
        />
        <div
          className="sp-skeleton"
          style={{ height: '18px', width: '52%', marginBottom: '6px' }}
        />
        <div
          className="sp-skeleton"
          style={{ height: '9px', width: '64%' }}
        />
      </div>
      <div
        className="sp-skeleton sp-skeleton-pill"
        style={{ width: '58px', height: '30px', flexShrink: 0 }}
      />
    </div>
  );
}
