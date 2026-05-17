import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMarkets } from '@functionspace/react';
import type { MarketState } from '@functionspace/core';
import { MarketRow } from './MarketRow';

type ScopeId = 'wc' | 'all';

interface MarketPickerModalProps {
  open: boolean;
  onClose: () => void;
  /** Called when the user picks a market. */
  onSelect: (market: MarketState) => void;
  /** Currently active market -- highlighted in the list. */
  activeMarketId?: number | null;
}

/**
 * Centered modal market picker. Lets the user swap markets without
 * leaving the Game screen. Defaults to the World Cup slice; toggling
 * to All widens to every open market.
 */
export function MarketPickerModal({
  open,
  onClose,
  onSelect,
  activeMarketId,
}: MarketPickerModalProps) {
  const [scope, setScope] = useState<ScopeId>('wc');
  const { markets, loading, error } = useMarkets({
    categories: scope === 'wc' ? ['World Cup'] : undefined,
    state: 'open',
    sortBy: 'totalVolume',
    sortOrder: 'desc',
  });

  // Freeze background scroll while the modal is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape -- standard modal affordance.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Change market"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--sp-modal-scrim)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '20px',
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 4 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            // Fixed height (clamped to viewport) so the modal does not
            // grow or shrink when the user toggles between World Cup and
            // All markets -- the inner list scrolls instead.
            style={{
              width: '100%',
              maxWidth: '460px',
              height: 'min(640px, calc(100vh - 40px))',
              background: 'var(--sp-bg)',
              borderRadius: 'var(--sp-radius-lg)',
              boxShadow: '0 24px 64px rgb(0 0 0 / 0.22)',
              border: '1px solid var(--sp-border)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
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
              <div className="sp-display-md" style={{ fontSize: '18px' }}>
                Change market
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="sp-tap sp-tap-surface"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '999px',
                  background: 'var(--sp-surface)',
                  border: '1px solid var(--sp-border)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--sp-text-secondary)',
                  fontSize: '14px',
                  lineHeight: 1,
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>

            {/* Scope toggle */}
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
              {(['wc', 'all'] as ScopeId[]).map((id) => {
                const active = id === scope;
                const label = id === 'wc' ? 'World Cup' : 'All markets';
                return (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setScope(id)}
                    className={active ? 'sp-tap' : 'sp-tap sp-tap-chip'}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '999px',
                      background: active ? 'var(--sp-primary)' : 'transparent',
                      color: active ? 'var(--sp-on-primary)' : 'var(--sp-text-secondary)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* List -- flex:1 fills the remaining modal height so the
             *  scrollable region is the same size regardless of how many
             *  markets the current scope returns. */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                paddingRight: '2px',
                marginRight: '-2px',
              }}
            >
              {loading && (
                <div
                  className="sp-secondary"
                  style={{ fontSize: '13px', padding: '24px 0', textAlign: 'center' }}
                >
                  Loading markets…
                </div>
              )}
              {error && (
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--sp-negative)',
                    padding: '24px 0',
                    textAlign: 'center',
                  }}
                >
                  {error.message}
                </div>
              )}
              {!loading &&
                !error &&
                markets.length > 0 &&
                markets.map((m) => {
                  const isActive = activeMarketId != null && m.marketId === activeMarketId;
                  return (
                    <div
                      key={m.marketId}
                      style={{
                        position: 'relative',
                        opacity: isActive ? 0.55 : 1,
                        pointerEvents: isActive ? 'none' : 'auto',
                      }}
                    >
                      <MarketRow market={m} onClick={() => onSelect(m)} />
                      {isActive && (
                        <span
                          className="sp-uppercase"
                          style={{
                            position: 'absolute',
                            top: '10px',
                            right: '12px',
                            background: 'var(--sp-accent)',
                            color: 'var(--sp-on-accent)',
                            padding: '3px 8px',
                            borderRadius: '999px',
                            fontSize: '10px',
                          }}
                        >
                          Current
                        </span>
                      )}
                    </div>
                  );
                })}
              {!loading && !error && markets.length === 0 && (
                <div
                  className="sp-secondary"
                  style={{ fontSize: '13px', padding: '24px 0', textAlign: 'center' }}
                >
                  No markets open right now.
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
