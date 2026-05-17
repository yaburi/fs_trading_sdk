import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Pill } from './Pill';

/** Crafted glyphs matching MarketIcon's stroke language (1.8 round-cap). */
const glyphPick: ReactNode = (
  <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="8" width="14" height="12" rx="2.5" />
    <path d="M8 5h11M7 6.5h12" />
    <path d="M9 14l2 2 4.5-4.5" />
  </g>
);

const glyphAim: ReactNode = (
  <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22" />
  </g>
);

const glyphStack: ReactNode = (
  <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.5 18 C 6.5 18, 7.5 7, 12 7 C 16.5 7, 17.5 18, 20.5 18" />
    <circle cx="7.5" cy="14" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="7.5" r="1.8" fill="currentColor" stroke="none" />
    <circle cx="16.5" cy="14" r="1.5" fill="currentColor" stroke="none" />
  </g>
);

const STEPS = [
  {
    overline: 'Step 1',
    title: 'Pick your match-up',
    body:
      "Yellow cards. VAR calls. Goals. Stadium attendance. Pick whichever World Cup market you have a feel for.",
    badge: { bg: '#FEF3C7', fg: '#D97706', glyph: glyphPick },
  },
  {
    overline: 'Step 2',
    title: 'Take the kick',
    body:
      "Line up the aim, time your release on the meter. Hit the sweet spot for a tight, confident shot. Miss it and your kick sprays. Your call gets fuzzier.",
    badge: { bg: '#FFEDD5', fg: '#EA580C', glyph: glyphAim },
  },
  {
    overline: 'Step 3',
    title: 'Beat the consensus',
    body:
      "You get up to 5 kicks. Stack them tight for conviction, or spread them wide to hedge. Aim where the consensus isn't. That's where the big payouts live.",
    badge: { bg: '#FCE7F3', fg: '#DB2777', glyph: glyphStack },
  },
];

interface IntroSheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Bottom-sheet that introduces the kick mechanic in three cards. Controlled
 * by the parent; first-visit auto-show lives at the call site.
 */
export function IntroSheet({ open, onClose }: IntroSheetProps) {
  const [step, setStep] = useState(0);

  // Reset to the first card whenever the sheet opens so re-triggering from
  // the info button doesn't strand the user mid-flow.
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  // Freeze background scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else onClose();
  };

  const current = STEPS[step];

  // Portal to document.body so the sheet escapes any parent transform/opacity
  // context (PageShell's motion.main animates in on mount, which would
  // otherwise fade the scrim along with the page on first paint).
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--sp-modal-scrim)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '420px',
              background: 'var(--sp-surface)',
              borderRadius: 'var(--sp-radius-lg)',
              boxShadow: '0 -8px 32px rgb(0 0 0 / 0.18)',
              padding: '24px 20px',
              paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', gap: '6px' }}>
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: i === step ? '20px' : '6px',
                      height: '6px',
                      borderRadius: '999px',
                      background:
                        i === step
                          ? 'var(--sp-primary)'
                          : i < step
                          ? 'var(--sp-text-muted)'
                          : 'var(--sp-border)',
                      transition: 'all 0.3s var(--sp-ease)',
                    }}
                  />
                ))}
              </div>
              <button
                onClick={onClose}
                className="sp-tap sp-tap-link"
                style={{
                  fontSize: '12px',
                  color: 'var(--sp-text-secondary)',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Skip
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '999px',
                    background: current.badge.bg,
                    color: current.badge.fg,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                  }}
                  aria-hidden
                >
                  <svg width="36" height="36" viewBox="0 0 24 24">
                    {current.badge.glyph}
                  </svg>
                </div>
                <div className="sp-uppercase sp-secondary" style={{ marginBottom: '6px' }}>
                  {current.overline}
                </div>
                <div
                  className="sp-display"
                  style={{
                    fontSize: '26px',
                    lineHeight: 1.15,
                    marginBottom: '10px',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {current.title}
                </div>
                <div
                  className="sp-secondary"
                  style={{ fontSize: '14px', lineHeight: 1.55, marginBottom: '24px' }}
                >
                  {current.body}
                </div>
              </motion.div>
            </AnimatePresence>

            <Pill variant="primary" size="lg" fullWidth onClick={handleNext}>
              {step < STEPS.length - 1 ? 'Next' : "Let's kick"}
            </Pill>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
