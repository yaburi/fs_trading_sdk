interface TimingMeterProps {
  phase: number; // 0..1 current sweep position
  sweetSpotCenter: number;
  sweetSpotHalfWidth: number;
  locked?: boolean;
}

/**
 * Horizontal timing bar. The sweet-spot band sits in the middle in coral;
 * a small dark indicator sweeps left ↔ right; tap to lock when inside the
 * band for a tight kick.
 */
export function TimingMeter({
  phase,
  sweetSpotCenter,
  sweetSpotHalfWidth,
  locked = false,
}: TimingMeterProps) {
  const sweetLeftPct = (sweetSpotCenter - sweetSpotHalfWidth) * 100;
  const sweetWidthPct = sweetSpotHalfWidth * 2 * 100;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
        }}
      >
        <span className="sp-uppercase sp-secondary">Timing</span>
        <span className="sp-secondary" style={{ fontSize: '11px' }}>
          {locked ? 'locked' : 'tap on the band'}
        </span>
      </div>
      <div
        style={{
          position: 'relative',
          height: '18px',
          borderRadius: '999px',
          background: 'var(--sp-border-subtle)',
          border: '1px solid var(--sp-border)',
          overflow: 'hidden',
        }}
      >
        {/* Sweet spot band */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${sweetLeftPct}%`,
            width: `${sweetWidthPct}%`,
            background: 'rgba(255, 107, 61, 0.18)',
            borderLeft: '1px solid rgba(255, 107, 61, 0.55)',
            borderRight: '1px solid rgba(255, 107, 61, 0.55)',
          }}
        />
        {/* Sweet spot center tick */}
        <div
          style={{
            position: 'absolute',
            top: '3px',
            bottom: '3px',
            left: `${sweetSpotCenter * 100}%`,
            width: '1px',
            background: 'rgba(255, 107, 61, 0.65)',
            transform: 'translateX(-0.5px)',
          }}
        />
        {/* Moving indicator */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${phase * 100}%`,
            transform: 'translate(-50%, -50%)',
            width: '12px',
            height: '12px',
            borderRadius: '999px',
            background: locked ? 'var(--sp-accent)' : 'var(--sp-primary)',
            border: '2px solid #FFFFFF',
            boxShadow: '0 1px 3px rgb(0 0 0 / 0.2)',
            transition: locked ? 'background 0.2s var(--sp-ease)' : undefined,
          }}
        />
      </div>
    </div>
  );
}
