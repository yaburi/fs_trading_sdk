import type { MarketState } from '@functionspace/core';
import { Card } from './Card';
import { MarketIcon } from './MarketIcon';
import { MarketStats } from './MarketStats';

interface MarketRowProps {
  market: MarketState;
  onClick: () => void;
}

/** Pull the tournament-specific tag for the chip, if any. */
function pickTags(market: MarketState): string[] {
  const md = (market.metadata as Record<string, unknown> | undefined) ?? {};
  const raw = md.categories ?? md.category ?? [];
  const cats = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
  // Skip generic parents that everything has
  const skip = new Set(['Sports', 'Soccer', 'Global']);
  const preferred = ['World Cup', 'CONCACAF', 'CONMEBOL', 'VAR', 'Mexico', 'Youth', 'Europe', 'UK'];
  // Sort: preferred first
  const filtered = cats.filter((c: string) => !skip.has(c));
  filtered.sort((a: string, b: string) => {
    const ai = preferred.indexOf(a);
    const bi = preferred.indexOf(b);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  return filtered.slice(0, 2);
}

export function MarketRow({ market, onClick }: MarketRowProps) {
  const tags = pickTags(market);
  const isResolved = market.resolutionState !== 'open';

  return (
    <Card padding="lg" onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
        <MarketIcon market={market} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="sp-display-md"
            style={{
              fontSize: '17px',
              lineHeight: 1.25,
              marginBottom: '8px',
              wordBreak: 'break-word',
            }}
          >
            {market.title}
          </div>

          <div style={{ marginBottom: '10px' }}>
            <MarketStats market={market} size="md" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {tags.map((tag) => (
              <span
                key={tag}
                className="sp-uppercase"
                style={{
                  padding: '3px 8px',
                  borderRadius: '999px',
                  background: tag === 'World Cup' ? 'var(--sp-accent)' : 'var(--sp-surface-2)',
                  color: tag === 'World Cup' ? 'var(--sp-on-accent)' : 'var(--sp-text-secondary)',
                  border: tag === 'World Cup' ? 'none' : '1px solid var(--sp-border)',
                  fontSize: '10px',
                }}
              >
                {tag === 'World Cup' ? 'WC 2026' : tag}
              </span>
            ))}
            {isResolved && (
              <span
                className="sp-uppercase"
                style={{
                  padding: '3px 8px',
                  borderRadius: '999px',
                  background: 'var(--sp-surface-2)',
                  color: 'var(--sp-text-muted)',
                  border: '1px solid var(--sp-border)',
                  fontSize: '10px',
                }}
              >
                {market.resolutionState}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
