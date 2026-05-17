import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@functionspace/react';
import type { UserProfile } from '@functionspace/core';
import { Pill } from './Pill';

interface AuthSheetProps {
  open: boolean;
  onClose: () => void;
  onLogin?: (user: UserProfile, action: 'login' | 'signup') => void;
}

/**
 * Centered modal that handles both the passwordless sign-in form (guest)
 * and the account / sign-out view (authenticated). One trigger; the
 * contents flip on auth state.
 */
export function AuthSheet({ open, onClose, onLogin }: AuthSheetProps) {
  useBodyScrollLock(open);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--sp-modal-scrim)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
        >
          <motion.div
            key="sheet"
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '380px',
              background: 'var(--sp-surface)',
              borderRadius: 'var(--sp-radius-lg)',
              boxShadow: 'var(--sp-shadow-pop)',
              padding: '22px',
              paddingBottom: 'calc(22px + env(safe-area-inset-bottom))',
            }}
          >
            <AuthSheetBody onClose={onClose} onLogin={onLogin} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AuthSheetBody({
  onClose,
  onLogin,
}: {
  onClose: () => void;
  onLogin?: (user: UserProfile, action: 'login' | 'signup') => void;
}) {
  const { user, isAuthenticated, passwordlessLogin, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Pick a username');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await passwordlessLogin(username.trim());
      onLogin?.(result.user, result.action);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = () => {
    logout();
    onClose();
  };

  if (isAuthenticated && user) {
    return (
      <div>
        <SheetHeader
          title={`Hey, ${user.username}`}
          subtitle="Manage your kick account."
          onClose={onClose}
        />

        <div
          style={{
            background: 'var(--sp-surface-2)',
            border: '1px solid var(--sp-border-subtle)',
            borderRadius: 'var(--sp-radius-md)',
            padding: '14px 16px',
            marginBottom: '14px',
          }}
        >
          <div className="sp-uppercase sp-secondary" style={{ marginBottom: '4px' }}>
            Wallet
          </div>
          <div className="sp-display-md" style={{ fontSize: '24px' }}>
            <span className="sp-mono">
              ${user.walletValue.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Pill
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => {
              onClose();
              navigate('/calls');
            }}
          >
            View my calls
          </Pill>
          <Pill variant="ghost" size="md" fullWidth onClick={handleSignOut}>
            Sign out
          </Pill>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <SheetHeader
        title="Sign in"
        subtitle="Just a username. No password, no email."
        onClose={onClose}
      />

      <label
        className="sp-uppercase sp-secondary"
        style={{ display: 'block', marginBottom: '6px' }}
      >
        Username
      </label>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Pick a name"
        autoComplete="username"
        autoFocus
        disabled={submitting || loading}
        style={{
          width: '100%',
          padding: '12px 14px',
          fontSize: '15px',
          borderRadius: 'var(--sp-radius-md)',
          border: '1px solid var(--sp-border)',
          background: 'var(--sp-surface-2)',
          color: 'var(--sp-text)',
          outline: 'none',
          marginBottom: '14px',
        }}
      />

      {error && (
        <div
          style={{
            color: 'var(--sp-negative)',
            fontSize: '12px',
            marginBottom: '12px',
          }}
        >
          {error}
        </div>
      )}

      <Pill
        variant="primary"
        size="lg"
        fullWidth
        type="submit"
        disabled={submitting || loading || !username.trim()}
      >
        {submitting ? 'Signing in…' : 'Sign in'}
      </Pill>

      <div
        className="sp-secondary"
        style={{
          fontSize: '11px',
          textAlign: 'center',
          marginTop: '12px',
          lineHeight: 1.4,
        }}
      >
        New here? We'll make the account for you on first sign in.
      </div>
    </form>
  );
}

function SheetHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '18px',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          className="sp-display-md"
          style={{ fontSize: '20px', letterSpacing: '-0.02em' }}
        >
          {title}
        </div>
        <div
          className="sp-secondary"
          style={{ fontSize: '12px', marginTop: '4px', lineHeight: 1.4 }}
        >
          {subtitle}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        style={{
          width: '30px',
          height: '30px',
          flexShrink: 0,
          borderRadius: '999px',
          background: 'var(--sp-surface-2)',
          border: '1px solid var(--sp-border)',
          fontSize: '18px',
          lineHeight: 1,
          color: 'var(--sp-text-secondary)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ×
      </button>
    </div>
  );
}

/** Freeze background scroll while the sheet is open. */
function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}
