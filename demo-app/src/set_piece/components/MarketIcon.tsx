import type { ReactNode } from 'react';
import type { MarketState } from '@functionspace/core';

type ColorKey =
  | 'amber'
  | 'red'
  | 'indigo'
  | 'blue'
  | 'teal'
  | 'emerald'
  | 'lime'
  | 'sky'
  | 'orange'
  | 'pink'
  | 'violet'
  | 'rose';

type IconKey =
  | 'yellowCard'
  | 'redCard'
  | 'screen'
  | 'stadium'
  | 'trophy'
  | 'person'
  | 'ball'
  | 'tv'
  | 'flag'
  | 'spark';

const palette: Record<ColorKey, { bg: string; fg: string }> = {
  amber: { bg: '#FEF3C7', fg: '#D97706' },
  red: { bg: '#FEE2E2', fg: '#DC2626' },
  indigo: { bg: '#E0E7FF', fg: '#4F46E5' },
  blue: { bg: '#DBEAFE', fg: '#2563EB' },
  teal: { bg: '#CCFBF1', fg: '#0D9488' },
  emerald: { bg: '#D1FAE5', fg: '#059669' },
  lime: { bg: '#ECFCCB', fg: '#65A30D' },
  sky: { bg: '#E0F2FE', fg: '#0284C7' },
  orange: { bg: '#FFEDD5', fg: '#EA580C' },
  pink: { bg: '#FCE7F3', fg: '#DB2777' },
  violet: { bg: '#EDE9FE', fg: '#7C3AED' },
  rose: { bg: '#FFE4E6', fg: '#E11D48' },
};

const glyphs: Record<IconKey, ReactNode> = {
  yellowCard: (
    <rect
      x="7"
      y="3.5"
      width="10"
      height="17"
      rx="2"
      fill="currentColor"
    />
  ),
  redCard: (
    <rect
      x="7"
      y="3.5"
      width="10"
      height="17"
      rx="2"
      fill="currentColor"
    />
  ),
  screen: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="M9 21h6M12 17v4" />
      <path d="M8 11l3 2 5-4" />
    </g>
  ),
  stadium: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="15" rx="9" ry="3.5" />
      <path d="M3 9c0-2 4-3.5 9-3.5s9 1.5 9 3.5v6" />
      <path d="M3 9v6" />
      <path d="M7 9l-1 6M17 9l1 6M12 5.5v9.5" />
    </g>
  ),
  trophy: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4h8v5a4 4 0 01-8 0V4z" />
      <path d="M16 5h2a2 2 0 010 4h-2M8 5H6a2 2 0 000 4h2" />
      <path d="M10 13v3h4v-3M9 20h6M12 16v4" />
    </g>
  ),
  person: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </g>
  ),
  ball: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <polygon
        points="12,8 15.2,10.3 14,14 10,14 8.8,10.3"
        fill="currentColor"
        stroke="none"
      />
      <path d="M12 8V3.6M15.2 10.3l4-1.3M14 14l2.5 3.6M10 14l-2.5 3.6M8.8 10.3l-4-1.3" />
    </g>
  ),
  tv: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="12" rx="2" />
      <path d="M8 3l4 4 4-4M7 19h10" />
    </g>
  ),
  flag: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 21V4" />
      <path d="M5 4h11l-2 3 2 3H5" fill="currentColor" stroke="none" />
      <path d="M5 4h11l-2 3 2 3H5" />
    </g>
  ),
  spark: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
    </g>
  ),
};

/** Pick the icon + color from the market title. Order matters: more specific keywords first. */
function pickIcon(market: MarketState): { icon: IconKey; color: ColorKey } {
  const t = market.title.toLowerCase();

  if (t.includes('yellow card')) return { icon: 'yellowCard', color: 'amber' };
  if (t.includes('red card')) return { icon: 'redCard', color: 'red' };
  if (t.includes('var') || t.includes('overturn')) return { icon: 'screen', color: 'indigo' };
  if (t.includes('attendance') || t.includes('venue')) return { icon: 'stadium', color: 'blue' };
  if (t.includes('concacaf')) return { icon: 'trophy', color: 'teal' };
  if (t.includes('conmebol')) return { icon: 'trophy', color: 'emerald' };
  if (t.includes('aged 21') || t.includes('younger') || t.includes('youth'))
    return { icon: 'person', color: 'lime' };
  if (t.includes('aged 35') || t.includes('older'))
    return { icon: 'person', color: 'sky' };
  if (t.includes('viewer') || t.includes('viewership') || t.includes('tv'))
    return { icon: 'tv', color: 'pink' };
  if (t.includes('goal') || t.includes('scored')) return { icon: 'ball', color: 'orange' };
  if (t.includes('final')) return { icon: 'trophy', color: 'rose' };

  return { icon: 'flag', color: 'violet' };
}

interface MarketIconProps {
  market: MarketState;
  size?: number;
}

export function MarketIcon({ market, size = 40 }: MarketIconProps) {
  const { icon, color } = pickIcon(market);
  const { bg, fg } = palette[color];
  const glyphSize = Math.round(size * 0.6);

  return (
    <div
      aria-hidden
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: '999px',
        background: bg,
        color: fg,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={glyphSize} height={glyphSize} viewBox="0 0 24 24">
        {glyphs[icon]}
      </svg>
    </div>
  );
}
