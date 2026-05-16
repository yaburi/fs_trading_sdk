import type { ReactNode } from 'react';

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

      <main
        style={{
          width: '100%',
          maxWidth: 'var(--sp-max-width)',
          padding: footer
            ? '20px 16px calc(96px + env(safe-area-inset-bottom))'
            : '20px 16px 32px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {children}
      </main>

      {footer && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            width: '100%',
            background: 'var(--sp-glass-footer)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderTop: '1px solid var(--sp-border-subtle)',
          }}
        >
          <div
            style={{
              maxWidth: 'var(--sp-max-width)',
              margin: '0 auto',
              padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
            }}
          >
            {footer}
          </div>
        </div>
      )}
    </div>
  );
}
