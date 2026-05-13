import type { FSThemeInput } from '@functionspace/react';

/**
 * Set Piece — paper centered light palette.
 * Mapped to the SDK's 9 core theme tokens.
 */
export const setPieceTheme: FSThemeInput = {
  primary: '#0F0F10',        // near-black — CTA pills, consensus curve stroke
  accent: '#FF6B3D',         // warm coral — preview line, brand pop
  positive: '#16A34A',       // grass green — GOAL, gains, on-target
  negative: '#DC2626',       // red card — losses, errors
  background: '#F4F4F5',     // cool light gray — page background
  surface: '#FFFFFF',        // pure white — floating cards
  text: '#0F0F10',           // near-black — primary text
  textSecondary: '#71717A',  // zinc gray — body, helpers
  border: '#E4E4E7',         // hairline — card borders
};

/** Shared design tokens not in the SDK theme system. */
export const tokens = {
  // Type scale
  font: {
    display: '"Bricolage Grotesque", system-ui, sans-serif',
    body: '"Inter", system-ui, sans-serif',
    mono: '"Geist Mono", ui-monospace, monospace',
    script: '"Caveat", cursive',
  },
  // Radius
  radius: {
    sm: '10px',
    md: '14px',
    lg: '20px',
    pill: '999px',
  },
  // Shadow
  shadow: {
    card: '0 1px 2px rgb(0 0 0 / 0.04), 0 0 0 1px rgb(0 0 0 / 0.02)',
    cardHover: '0 2px 8px rgb(0 0 0 / 0.06), 0 0 0 1px rgb(0 0 0 / 0.03)',
    pop: '0 8px 24px rgb(0 0 0 / 0.08)',
  },
  // Spacing
  space: {
    page: '16px',
    section: '24px',
    card: '20px',
    tight: '12px',
  },
  // Layout
  maxWidth: '520px',
} as const;

export const setPieceConfig = {
  baseUrl: import.meta.env.VITE_FS_BASE_URL,
};
