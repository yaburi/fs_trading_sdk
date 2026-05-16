import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PasswordlessAuthWidget } from '@functionspace/ui';
import type { UserProfile } from '@functionspace/core';

interface AuthSheetProps {
  open: boolean;
  onClose: () => void;
  onLogin: (user: UserProfile, action: 'login' | 'signup') => void;
}

/**
 * Bottom-sheet-on-mobile / centered-modal-on-desktop wrapper around
 * the SDK's PasswordlessAuthWidget. Triggered by the Confirm screen's
 * "Sign in to kick" CTA when the user is in guest mode.
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
            key="sheet"
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
              padding: '20px',
              paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
              margin: '0 auto',
              alignSelf: 'flex-end',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <div>
                <div
                  className="sp-display-md"
                  style={{ fontSize: '18px', letterSpacing: '-0.02em' }}
                >
                  Sign in to kick
                </div>
                <div
                  className="sp-secondary"
                  style={{ fontSize: '12px', marginTop: '2px' }}
                >
                  Just a username. No password, no email.
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '999px',
                  background: 'var(--sp-surface-2)',
                  border: '1px solid var(--sp-border)',
                  fontSize: '18px',
                  color: 'var(--sp-text-secondary)',
                }}
              >
                ×
              </button>
            </div>
            <PasswordlessAuthWidget onLogin={onLogin} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Freeze background scroll while a sheet is open. iOS would otherwise let
 * the page rubber-band underneath the sheet. */
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
