import type { MarketState } from '@functionspace/core';

type Size = 'sm' | 'md' | 'lg';

const SIZE_PX: Record<Size, number> = { sm: 11, md: 12, lg: 13 };

function formatRange(market: MarketState): string {
  const { lowerBound, upperBound } = market.config;
  const decimals = market.decimals ?? 0;
  const fmt = (n: number) =>
    n.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  return `${fmt(lowerBound)} – ${fmt(upperBound)}`;
}

function formatConsensus(market: MarketState): string | null {
  const mean = market.consensusMean;
  if (mean == null || !isFinite(mean)) return null;
  // Use the market's declared decimals as a floor, but if the value still
  // carries a fractional part at that precision, bump up by one so a
  // whole-number market (decimals=0) doesn't round "24.5" to "25".
  const baseDecimals = market.decimals ?? 0;
  const rounded = Number(mean.toFixed(baseDecimals));
  const decimals = Math.abs(mean - rounded) < 1e-6 ? baseDecimals : baseDecimals + 1;
  return mean.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

interface MarketStatsProps {
  market: MarketState;
  size?: Size;
}

/**
 * Shared "Consensus · Range" line used on every market card. Consensus is
 * shown first when available; Range is always shown. Uses inline text flow so
 * the middot separator stays between the two on every wrap.
 */
export function MarketStats({ market, size = 'md' }: MarketStatsProps) {
  const consensus = formatConsensus(market);
  const range = formatRange(market);
  const units = market.xAxisUnits || '';
  const fontSize = `${SIZE_PX[size]}px`;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        columnGap: '8px',
        rowGap: '2px',
        fontSize,
        color: 'var(--sp-text-secondary)',
        lineHeight: 1.45,
      }}
    >
      {consensus && (
        <>
          <span style={{ whiteSpace: 'nowrap' }}>
            <span className="sp-uppercase" style={{ marginRight: '6px' }}>
              Consensus
            </span>
            <span className="sp-mono" style={{ color: 'var(--sp-text)' }}>
              {consensus}
            </span>
            {units && <span style={{ marginLeft: '4px' }}>{units}</span>}
          </span>
          <span aria-hidden="true" style={{ opacity: 0.55 }}>
            ·
          </span>
        </>
      )}
      <span style={{ whiteSpace: 'nowrap' }}>
        <span className="sp-uppercase" style={{ marginRight: '6px' }}>
          Range
        </span>
        <span className="sp-mono" style={{ color: 'var(--sp-text)' }}>
          {range}
        </span>
        {units && <span style={{ marginLeft: '4px' }}>{units}</span>}
      </span>
    </div>
  );
}
