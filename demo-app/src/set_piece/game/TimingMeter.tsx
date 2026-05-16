import { useEffect, useRef, type MutableRefObject } from 'react';

interface TimingMeterProps {
  /** Live phase 0..1 driven by the kick engine via rAF. */
  phaseRef: MutableRefObject<number>;
  sweetSpotCenter: number;
  sweetSpotHalfWidth: number;
  /** When true, the indicator stops chasing the phase ref and pins to its last
   *  visual position. */
  locked?: boolean;
}

/**
 * Horizontal timing bar. The sweet-spot band sits in the middle in coral;
 * a small dark indicator sweeps left and right. Tap to lock when inside
 * the band for a tight kick. The indicator mutates its own `left` style
 * via rAF so the bar never re-renders during the sweep.
 */
export function TimingMeter({
  phaseRef,
  sweetSpotCenter,
  sweetSpotHalfWidth,
  locked = false,
}: TimingMeterProps) {
  const indicatorRef = useRef<HTMLDivElement>(null);
  const sweetLeftPct = (sweetSpotCenter - sweetSpotHalfWidth) * 100;
  const sweetWidthPct = sweetSpotHalfWidth * 2 * 100;

  useEffect(() => {
    if (locked) return;
    let raf = 0;
    const tick = () => {
      const el = indicatorRef.current;
      if (el) {
        el.style.left = `${phaseRef.current * 100}%`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phaseRef, locked]);

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
            background: 'var(--sp-accent-soft)',
            borderLeft: '1px solid var(--sp-accent-edge)',
            borderRight: '1px solid var(--sp-accent-edge)',
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
            background: 'var(--sp-accent-strong)',
            transform: 'translateX(-0.5px)',
          }}
        />
        {/* Moving indicator (driven by rAF on indicatorRef.current.style.left) */}
        <div
          ref={indicatorRef}
          style={{
            position: 'absolute',
            top: '50%',
            left: `${phaseRef.current * 100}%`,
            transform: 'translate(-50%, -50%)',
            width: '12px',
            height: '12px',
            borderRadius: '999px',
            background: locked ? 'var(--sp-accent)' : 'var(--sp-primary)',
            border: '2px solid var(--sp-surface)',
            boxShadow: '0 1px 3px rgb(0 0 0 / 0.2)',
            transition: locked ? 'background 0.2s var(--sp-ease)' : undefined,
          }}
        />
      </div>
    </div>
  );
}
