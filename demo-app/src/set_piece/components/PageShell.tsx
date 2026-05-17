import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface PageShellProps {
  children: ReactNode;
  /** Optional top-of-page header band (sticky if true). */
  header?: ReactNode;
  /** Optional bottom-of-page action band (sticky). */
  footer?: ReactNode;
}

/**
 * Centered 520px column that holds the entire app on every screen.
 * Mobile fills the viewport; desktop gets paper margins on the sides.
 */
export function PageShell({ children, header, footer }: PageShellProps) {
  const reduceMotion = useReducedMotion();
  const yOffset = reduceMotion ? 0 : 16;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'var(--sp-bg)',
      }}
    >
      {header && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            width: '100%',
          }}
        >
          {/*
           * Glass layer with top-heavy blur that fades out toward the bottom.
           * Sits behind the header content; pointer-events disabled so taps pass through.
           * Extends a few pixels below the band so the fade dissolves into the page
           * rather than terminating on a hard edge.
           */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: '-12px',
              pointerEvents: 'none',
              background:
                'linear-gradient(to bottom, var(--sp-glass-top) 0%, var(--sp-glass-mid) 60%, rgba(244, 244, 245, 0) 100%)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              maskImage:
                'linear-gradient(to bottom, #000 0%, #000 45%, rgba(0,0,0,0.6) 75%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage:
                'linear-gradient(to bottom, #000 0%, #000 45%, rgba(0,0,0,0.6) 75%, rgba(0,0,0,0) 100%)',
            }}
          />
          <div
            style={{
              position: 'relative',
              maxWidth: 'var(--sp-max-width)',
              margin: '0 auto',
              padding: '12px 16px',
            }}
          >
            {header}
          </div>
        </div>
      )}

      <motion.main
        className={footer ? 'sp-pageshell-main sp-pageshell-main--with-footer' : 'sp-pageshell-main'}
        style={{
          width: '100%',
          maxWidth: 'var(--sp-max-width)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
        initial={{ opacity: 0, y: yOffset }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: yOffset }}
        transition={{ duration: reduceMotion ? 0.1 : 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.main>

      {footer && (
        <motion.div
          className="sp-pageshell-footer"
          initial={{ opacity: 0, y: yOffset }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: yOffset }}
          transition={{
            duration: reduceMotion ? 0.1 : 0.22,
            ease: [0.22, 1, 0.36, 1],
            delay: reduceMotion ? 0 : 0.05,
          }}
        >
          <div className="sp-pageshell-footer-inner">{footer}</div>
        </motion.div>
      )}
    </div>
  );
}
