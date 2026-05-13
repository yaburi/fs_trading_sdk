import { useAuth } from '@functionspace/react';
import { Pill } from './Pill';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  /** Optional left-side back button. */
  onBack?: () => void;
  /** Optional center label that replaces the brand mark. */
  centerLabel?: string;
  /** Show wallet balance on the right when authenticated. */
  showWallet?: boolean;
}

export function Header({ onBack, centerLabel, showWallet = true }: HeaderProps) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        minHeight: '36px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '64px' }}>
        {onBack ? (
          <button
            aria-label="Back"
            onClick={onBack}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '999px',
              background: 'var(--sp-surface)',
              border: '1px solid var(--sp-border)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--sp-text)',
              fontSize: '16px',
            }}
          >
            ←
          </button>
        ) : null}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '4px',
          flex: 1,
          justifyContent: onBack ? 'center' : 'flex-start',
        }}
      >
        {centerLabel ? (
          <span className="sp-display-md" style={{ fontSize: '15px' }}>
            {centerLabel}
          </span>
        ) : (
          <>
            <span
              className="sp-display"
              style={{ fontSize: '18px', letterSpacing: '-0.03em' }}
            >
              Set Piece
            </span>
            <span
              className="sp-secondary"
              style={{ fontSize: '11px', marginLeft: '6px' }}
            >
              · WC 2026
            </span>
          </>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '64px', justifyContent: 'flex-end' }}>
        {isAuthenticated && user && showWallet ? (
          <button
            onClick={() => navigate('/calls')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '999px',
              background: 'var(--sp-surface)',
              border: '1px solid var(--sp-border)',
              color: 'var(--sp-text)',
              fontSize: '13px',
              fontFamily: 'var(--sp-font-mono)',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '999px',
                background: 'var(--sp-positive)',
              }}
            />
            ${user.walletValue.toFixed(0)}
          </button>
        ) : !isAuthenticated ? (
          <Pill size="sm" variant="ghost">
            guest
          </Pill>
        ) : null}
      </div>
    </div>
  );
}
