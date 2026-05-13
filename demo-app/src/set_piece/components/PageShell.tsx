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
            background: 'rgba(244, 244, 245, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderBottom: '1px solid var(--sp-border-subtle)',
          }}
        >
          <div
            style={{
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
          padding: '20px 16px 32px',
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
            background: 'rgba(244, 244, 245, 0.92)',
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
