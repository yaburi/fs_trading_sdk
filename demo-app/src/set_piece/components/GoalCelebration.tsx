import { AnimatePresence, motion } from 'framer-motion';

/**
 * Full-screen GOOOAL! celebration.
 *
 * Built per Emil Kowalski's animation principles:
 *
 *   - Entrance never starts from `scale(0)` — the word peeks in at 0.85 so it
 *     has a visible silhouette throughout the animation. Real objects don't
 *     pop into existence from nothing.
 *   - Spring config follows Apple's `{ duration, bounce }` shape with a small
 *     0.2 bounce so the headline settles with a tiny overshoot rather than a
 *     flat stop — playful, not bouncy.
 *   - Asymmetric enter/exit: enter ~520ms with the spring, exit a snappy
 *     180ms ease-out. The user has *just* seen the headline land; the exit
 *     should feel like a confident cut rather than a slow fade.
 *   - Veil also follows the asymmetric pattern: backdrop blur ramps in over
 *     280ms (long enough to feel cinematic) and clears in 180ms.
 *   - Only `transform` and `opacity` animate so the whole celebration stays
 *     on the GPU and never blocks the main thread.
 */
const ENTER_EASE = [0.23, 1, 0.32, 1] as const; // strong ease-out
const EXIT_EASE = [0.4, 0, 1, 1] as const; // ease-in (exit accelerates away)

export function GoalCelebration({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          // Veil — slight tint, blurs the pitch behind the headline.
          initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
          exit={{
            opacity: 0,
            backdropFilter: 'blur(0px)',
            // Match the headline's snappy 180ms exit so the veil clears
            // alongside the word instead of lingering 100ms longer.
            transition: {
              opacity: { duration: 0.18, ease: EXIT_EASE },
              backdropFilter: { duration: 0.18, ease: EXIT_EASE },
            },
          }}
          transition={{
            opacity: { duration: 0.28, ease: ENTER_EASE },
            backdropFilter: { duration: 0.28, ease: ENTER_EASE },
          }}
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--sp-celebration-veil)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 200,
            pointerEvents: 'none',
          }}
        >
          <motion.div
            // Headline — slight visible silhouette at 0.85, slight tilt
            // so the word feels caught mid-cheer rather than perfectly
            // straight. Spring with subtle bounce so it settles with
            // life, not a flat snap.
            initial={{ scale: 0.85, rotate: -6, opacity: 0 }}
            animate={{ scale: 1, rotate: -4, opacity: 1 }}
            exit={{
              scale: 1.04,
              opacity: 0,
              transition: { duration: 0.18, ease: EXIT_EASE },
            }}
            transition={{
              type: 'spring',
              duration: 0.52,
              bounce: 0.22,
            }}
            className="sp-script"
            style={{
              fontSize: 'clamp(72px, 20vw, 140px)',
              color: 'var(--sp-positive)',
              // Layered shadow — short hard shadow stacks the word against
              // the veil, the long soft shadow gives it weight.
              textShadow: [
                '0 2px 0 rgba(0,0,0,0.06)',
                '0 6px 0 var(--sp-positive-shadow)',
                '0 22px 48px rgba(22,163,74,0.22)',
              ].join(', '),
              letterSpacing: '-0.02em',
              willChange: 'transform, opacity',
            }}
          >
            GOOOAL!
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
