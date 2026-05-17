import type { MarketState } from '@functionspace/core';
import {
  SoccerBall,
  Football,
  Trophy,
  Medal1st,
  Crown,
  Tournament,
  Eye,
  MediaVideo,
  ModernTv,
  Group,
  User,
  UserBadgeCheck,
  HomeUser,
  BasketballField,
  TriangleFlag,
  DashFlag,
  Clock,
  Hourglass,
  Star,
  Sparks,
  FireFlame,
  Globe,
  MapPin,
  StatsUpSquare,
  Heart,
  Network,
  PerspectiveView,
} from 'iconoir-react';
import type { SVGProps } from 'react';

// iconoir-react ships React 19 typings while this app uses React 18; the
// ref-attribute shapes are subtly different. Sidestep that with a loose
// component alias — we already verify renders via the build smoke test.
type IconoirIconProps = SVGProps<SVGSVGElement>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconComp = any;

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
  | 'rose'
  | 'cyan'
  | 'fuchsia'
  | 'yellow';

const palette: Record<ColorKey, { bg: string; fg: string; ring: string }> = {
  amber:   { bg: '#FEF3C7', fg: '#B45309', ring: 'rgba(180, 83, 9, 0.18)' },
  yellow:  { bg: '#FEF9C3', fg: '#A16207', ring: 'rgba(161, 98, 7, 0.18)' },
  red:     { bg: '#FEE2E2', fg: '#B91C1C', ring: 'rgba(185, 28, 28, 0.18)' },
  indigo:  { bg: '#E0E7FF', fg: '#4338CA', ring: 'rgba(67, 56, 202, 0.18)' },
  blue:    { bg: '#DBEAFE', fg: '#1D4ED8', ring: 'rgba(29, 78, 216, 0.18)' },
  teal:    { bg: '#CCFBF1', fg: '#0F766E', ring: 'rgba(15, 118, 110, 0.18)' },
  emerald: { bg: '#D1FAE5', fg: '#047857', ring: 'rgba(4, 120, 87, 0.18)' },
  lime:    { bg: '#ECFCCB', fg: '#4D7C0F', ring: 'rgba(77, 124, 15, 0.18)' },
  sky:     { bg: '#E0F2FE', fg: '#0369A1', ring: 'rgba(3, 105, 161, 0.18)' },
  orange:  { bg: '#FFEDD5', fg: '#C2410C', ring: 'rgba(194, 65, 12, 0.18)' },
  pink:    { bg: '#FCE7F3', fg: '#BE185D', ring: 'rgba(190, 24, 93, 0.18)' },
  violet:  { bg: '#EDE9FE', fg: '#6D28D9', ring: 'rgba(109, 40, 217, 0.18)' },
  rose:    { bg: '#FFE4E6', fg: '#BE123C', ring: 'rgba(190, 18, 60, 0.18)' },
  cyan:    { bg: '#CFFAFE', fg: '#0E7490', ring: 'rgba(14, 116, 144, 0.18)' },
  fuchsia: { bg: '#FAE8FF', fg: '#A21CAF', ring: 'rgba(162, 28, 175, 0.18)' },
};

interface IconChoice {
  Icon: IconComp;
  color: ColorKey;
  /** Optional override for icon color (e.g. yellow card glyph should be amber even on a yellow bg). */
  glyphColor?: string;
}

/**
 * Match a market title to a unique icon + color. Order matters: most specific
 * keywords first. Goal is to ensure no two adjacent markets share a glyph in
 * the list, so the user can scan the column visually.
 */
function pickIcon(market: MarketState): IconChoice {
  const t = market.title.toLowerCase();

  // Discipline / cards
  if (t.includes('yellow card')) return { Icon: YellowCardGlyph, color: 'yellow' };
  if (t.includes('red card')) return { Icon: RedCardGlyph, color: 'red' };
  if (t.includes('foul') || t.includes('booking')) return { Icon: DashFlag, color: 'amber' };

  // Officials
  if (t.includes('var') || t.includes('overturn')) return { Icon: Eye, color: 'indigo' };
  if (t.includes('referee') || t.includes('whistle')) return { Icon: PerspectiveView, color: 'violet' };

  // Stadium / attendance / venue
  if (t.includes('attendance')) return { Icon: Group, color: 'blue' };
  if (t.includes('venue') || t.includes('host city') || t.includes('stadium'))
    return { Icon: BasketballField, color: 'sky' };

  // Tournament / format / federation
  if (t.includes('concacaf')) return { Icon: Tournament, color: 'teal' };
  if (t.includes('conmebol')) return { Icon: Trophy, color: 'emerald' };
  if (t.includes('uefa') || t.includes('europe')) return { Icon: Crown, color: 'fuchsia' };
  if (t.includes('group stage') || t.includes('group ')) return { Icon: Tournament, color: 'cyan' };
  if (t.includes('knockout') || t.includes('round of') || t.includes('quarter') || t.includes('semi'))
    return { Icon: Tournament, color: 'violet' };

  // Demographics
  if (t.includes('aged 21') || t.includes('younger') || t.includes('youth') || t.includes('u-21') || t.includes('u21'))
    return { Icon: User, color: 'lime' };
  if (t.includes('aged 35') || t.includes('older') || t.includes('veteran'))
    return { Icon: UserBadgeCheck, color: 'sky' };

  // Audience / viewership
  if (t.includes('viewer') || t.includes('viewership')) return { Icon: ModernTv, color: 'pink' };
  if (t.includes('tv') || t.includes('broadcast')) return { Icon: MediaVideo, color: 'rose' };
  if (t.includes('streaming') || t.includes('stream')) return { Icon: MediaVideo, color: 'fuchsia' };

  // Scoring / play
  if (t.includes('goal') || t.includes('scored') || t.includes('xg'))
    return { Icon: SoccerBall, color: 'orange' };
  if (t.includes('shot') || t.includes('possession')) return { Icon: Football, color: 'amber' };
  if (t.includes('pass') || t.includes('cross')) return { Icon: Network, color: 'sky' };
  if (t.includes('save') || t.includes('keeper')) return { Icon: HomeUser, color: 'teal' };

  // Time / duration
  if (t.includes('minute') || t.includes('first half') || t.includes('second half'))
    return { Icon: Clock, color: 'blue' };
  if (t.includes('stoppage') || t.includes('added time') || t.includes('extra time'))
    return { Icon: Hourglass, color: 'amber' };

  // Outcome / final
  if (t.includes('winner') || t.includes('champion')) return { Icon: Trophy, color: 'rose' };
  if (t.includes('final')) return { Icon: Medal1st, color: 'rose' };
  if (t.includes('top scorer') || t.includes('golden boot')) return { Icon: Star, color: 'orange' };
  if (t.includes('mvp') || t.includes('best player')) return { Icon: Medal1st, color: 'pink' };

  // Sentiment / momentum
  if (t.includes('upset') || t.includes('shock')) return { Icon: FireFlame, color: 'red' };
  if (t.includes('streak') || t.includes('run')) return { Icon: Sparks, color: 'orange' };
  if (t.includes('odds') || t.includes('rating')) return { Icon: StatsUpSquare, color: 'indigo' };

  // Place / geography
  if (t.includes('global') || t.includes('world')) return { Icon: Globe, color: 'sky' };
  if (t.includes('mexico') || t.includes('canada') || t.includes('usa')) return { Icon: MapPin, color: 'teal' };

  // Fans / cultural
  if (t.includes('fan') || t.includes('supporter')) return { Icon: Heart, color: 'rose' };

  // Default — distinguishable triangular flag
  // Stable per-market fallback color so the list still feels varied even when
  // the title doesn't match a category.
  return { Icon: TriangleFlag, color: fallbackColor(market.title) };
}

/** Pseudo-random color choice keyed off the title so a given market keeps the
 *  same color across screens. */
function fallbackColor(title: string): ColorKey {
  const keys: ColorKey[] = ['violet', 'cyan', 'pink', 'lime', 'sky', 'orange', 'teal'];
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
  return keys[h % keys.length];
}

interface MarketIconProps {
  market: MarketState;
  size?: number;
}

/**
 * Round badge that wraps an iconoir glyph in a subtly-recessed surface. The
 * outer ring + inner ring + radial highlight read as a soft enamel pin instead
 * of a flat circle — picks up the skeuomorphic mood of the buttons.
 */
export function MarketIcon({ market, size = 40 }: MarketIconProps) {
  const { Icon, color, glyphColor } = pickIcon(market);
  const { bg, fg, ring } = palette[color];
  const glyphSize = Math.round(size * 0.55);

  return (
    <div
      aria-hidden
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: '999px',
        background: `radial-gradient(ellipse at 35% 28%, color-mix(in srgb, ${bg} 60%, white), ${bg})`,
        color: glyphColor ?? fg,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        boxShadow: `inset 0 0 0 1px ${ring}, inset 0 -1px 0 rgba(0,0,0,0.05), 0 1px 1px rgba(0,0,0,0.04)`,
      }}
    >
      <Icon
        width={glyphSize}
        height={glyphSize}
        strokeWidth={1.8}
        color={glyphColor ?? fg}
      />
    </div>
  );
}

/** Yellow card pictogram. Iconoir doesn't have a referee-card glyph, so this
 *  is a custom 24x24 SVG that matches iconoir's 1.5 stroke language. */
const YellowCardGlyph: IconComp = ({
  width = '1.5em',
  height = '1.5em',
  color = 'currentColor',
  strokeWidth = 1.5,
  ...rest
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="#FACC15"
    stroke={color}
    strokeWidth={strokeWidth as number}
    strokeLinejoin="round"
    {...rest}
  >
    <rect x="7" y="3.5" width="10" height="17" rx="2" />
  </svg>
);

const RedCardGlyph: IconComp = ({
  width = '1.5em',
  height = '1.5em',
  color = 'currentColor',
  strokeWidth = 1.5,
  ...rest
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="#EF4444"
    stroke={color}
    strokeWidth={strokeWidth as number}
    strokeLinejoin="round"
    {...rest}
  >
    <rect x="7" y="3.5" width="10" height="17" rx="2" />
  </svg>
);
