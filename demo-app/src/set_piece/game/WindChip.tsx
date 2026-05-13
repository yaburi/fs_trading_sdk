import type { Wind } from './useKickEngine';

interface WindChipProps {
  wind: Wind;
  /** Render slightly dimmer when no kick is in progress. */
  muted?: boolean;
}

/**
 * Compact pill: arrow icon (rotated by wind direction) + speed.
 * Speed shown in friendly km/h units derived from (|dir| × speed) magnitude.
 */
export function WindChip({ wind, muted = false }: WindChipProps) {
  // Map wind magnitude (|dir| * speed) to a fake km/h value for display.
  const magnitude = Math.abs(wind.dir) * wind.speed;
  const kmh = Math.round(magnitude * 25 + 2); // ~2 to ~27 km/h

  // Rotation: -1 (full left) → pointing west = 270° in screen coords.
  // 0 (no wind) → pointing right (east) = 90°.
  // +1 (full right) → pointing right = 90°.
  // We want a horizontal arrow that tilts based on dir sign — use atan2.
  // Simpler: x = wind.dir, y = 0 → angle from east. negative dir → west.
  const angleDeg = wind.dir >= 0 ? 0 : 180;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '999px',
        background: 'var(--sp-surface)',
        border: '1px solid var(--sp-border)',
        fontFamily: 'var(--sp-font-mono)',
        fontSize: '11px',
        color: 'var(--sp-text-secondary)',
        opacity: muted ? 0.55 : 1,
        transition: 'opacity 0.2s var(--sp-ease)',
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        style={{ transform: `rotate(${angleDeg}deg)`, transition: 'transform 0.3s var(--sp-ease)' }}
      >
        <path
          d="M2 6 L10 6 M7 3 L10 6 L7 9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{kmh} km/h</span>
    </div>
  );
}
