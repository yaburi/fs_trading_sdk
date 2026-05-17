import type { ButtonHTMLAttributes, ReactNode, CSSProperties } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent';
type Size = 'sm' | 'md' | 'lg';

interface PillProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const sizeMap: Record<Size, { padding: string; fontSize: string; minHeight: string }> = {
  sm: { padding: '6px 14px', fontSize: '13px', minHeight: '32px' },
  md: { padding: '10px 20px', fontSize: '14px', minHeight: '42px' },
  lg: { padding: '14px 28px', fontSize: '16px', minHeight: '54px' },
};

/**
 * Skeuomorphic pill button.
 *
 * Three rendering layers (per variant) build the depth:
 *   1. Bottom drop shadow: dark, sits under the button so it appears raised.
 *   2. Surface gradient: light at the top, darker at the bottom — fakes
 *      omnidirectional lighting from above.
 *   3. Inset highlight (top) + inset shadow (bottom): bevels the rim so the
 *      surface looks domed instead of flat.
 *
 * On `:active` (handled via inline event handlers because we can't add
 * pseudo-classes from inline styles), the button drops by 1px and loses one
 * layer of drop shadow, making the press feel mechanical.
 */
export function Pill({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled,
  style,
  ...rest
}: PillProps) {
  const dims = sizeMap[size];

  const variantStyles: Record<Variant, CSSProperties> = {
    primary: {
      // Deep near-black ink. Subtle top sheen makes it look enameled rather
      // than a paint chip. The shadow stack reads as "raised dark pebble."
      background:
        'linear-gradient(180deg, #2A2A2C 0%, #131315 60%, #050507 100%)',
      color: 'var(--sp-on-primary)',
      boxShadow: [
        'inset 0 1px 0 rgba(255,255,255,0.18)',
        'inset 0 -1px 0 rgba(0,0,0,0.55)',
        'inset 0 0 0 1px rgba(0,0,0,0.65)',
        '0 1px 0 rgba(255,255,255,0.6)',
        '0 2px 4px rgba(0,0,0,0.18)',
        '0 6px 14px rgba(0,0,0,0.18)',
      ].join(', '),
      textShadow: '0 -1px 0 rgba(0,0,0,0.4)',
    },
    accent: {
      // Warm coral with a heated highlight. Reads like a hot enamel pin —
      // appropriate for the "GOAL!" CTA on the confirm screen.
      background:
        'linear-gradient(180deg, #FF8B65 0%, #FF6B3D 55%, #E2542B 100%)',
      color: 'var(--sp-on-accent)',
      boxShadow: [
        'inset 0 1px 0 rgba(255,255,255,0.45)',
        'inset 0 -1px 0 rgba(120,30,0,0.45)',
        'inset 0 0 0 1px rgba(180,60,15,0.5)',
        '0 1px 0 rgba(255,255,255,0.55)',
        '0 2px 6px rgba(226, 84, 43, 0.35)',
        '0 8px 18px rgba(226, 84, 43, 0.28)',
      ].join(', '),
      textShadow: '0 -1px 0 rgba(120, 30, 0, 0.35)',
    },
    secondary: {
      // Bright porcelain card. Crisp top highlight, soft hairline edge, then
      // a low drop shadow — sits "on" the surface rather than "in" it.
      background:
        'linear-gradient(180deg, #FFFFFF 0%, #F4F4F5 100%)',
      color: 'var(--sp-text)',
      boxShadow: [
        'inset 0 1px 0 rgba(255,255,255,0.95)',
        'inset 0 -1px 0 rgba(0,0,0,0.06)',
        'inset 0 0 0 1px rgba(0,0,0,0.08)',
        '0 1px 2px rgba(0,0,0,0.06)',
        '0 4px 10px rgba(0,0,0,0.06)',
      ].join(', '),
    },
    ghost: {
      // No surface, no shadow — pure text affordance. Hover/active still get
      // a faint surface to confirm the press.
      background: 'transparent',
      color: 'var(--sp-text-secondary)',
      boxShadow: 'none',
    },
  };

  // Style applied during the brief mousedown depressed state. Drops the
  // button by 1px and trims a shadow layer so it visually settles.
  const pressedStyles: Record<Variant, CSSProperties> = {
    primary: {
      background:
        'linear-gradient(180deg, #131315 0%, #050507 100%)',
      boxShadow: [
        'inset 0 1px 2px rgba(0,0,0,0.45)',
        'inset 0 -1px 0 rgba(255,255,255,0.05)',
        'inset 0 0 0 1px rgba(0,0,0,0.65)',
        '0 1px 0 rgba(255,255,255,0.35)',
        '0 1px 2px rgba(0,0,0,0.12)',
      ].join(', '),
    },
    accent: {
      background:
        'linear-gradient(180deg, #E2542B 0%, #C73E18 100%)',
      boxShadow: [
        'inset 0 1px 2px rgba(120,30,0,0.45)',
        'inset 0 -1px 0 rgba(255,255,255,0.15)',
        'inset 0 0 0 1px rgba(180,60,15,0.6)',
        '0 1px 0 rgba(255,255,255,0.4)',
        '0 1px 3px rgba(226, 84, 43, 0.3)',
      ].join(', '),
    },
    secondary: {
      background:
        'linear-gradient(180deg, #EFEFF1 0%, #FAFAFB 100%)',
      boxShadow: [
        'inset 0 1px 2px rgba(0,0,0,0.08)',
        'inset 0 -1px 0 rgba(255,255,255,0.6)',
        'inset 0 0 0 1px rgba(0,0,0,0.1)',
      ].join(', '),
    },
    ghost: {
      background: 'rgba(0,0,0,0.04)',
      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
    },
  };

  const restoreStyle = (el: HTMLButtonElement) => {
    const base = variantStyles[variant];
    el.style.transform = '';
    if (base.background) el.style.background = base.background as string;
    if (base.boxShadow) el.style.boxShadow = base.boxShadow as string;
  };

  const applyPress = (el: HTMLButtonElement) => {
    const press = pressedStyles[variant];
    el.style.transform = 'translateY(1px) scale(0.985)';
    if (press.background) el.style.background = press.background as string;
    if (press.boxShadow) el.style.boxShadow = press.boxShadow as string;
  };

  return (
    <button
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        borderRadius: 'var(--sp-radius-pill)',
        fontFamily: 'var(--sp-font-body)',
        fontWeight: 600,
        letterSpacing: '-0.005em',
        width: fullWidth ? '100%' : 'auto',
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        // 140ms ease-out feels mechanical without dragging.
        transition: [
          'transform 140ms cubic-bezier(0.23, 1, 0.32, 1)',
          'box-shadow 160ms cubic-bezier(0.23, 1, 0.32, 1)',
          'background 160ms ease-out',
          'opacity 160ms ease-out',
        ].join(', '),
        position: 'relative',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        ...dims,
        ...variantStyles[variant],
        ...style,
      }}
      onMouseDown={(e) => {
        if (!disabled) applyPress(e.currentTarget);
      }}
      onMouseUp={(e) => restoreStyle(e.currentTarget)}
      onMouseLeave={(e) => restoreStyle(e.currentTarget)}
      onTouchStart={(e) => {
        if (!disabled) applyPress(e.currentTarget);
      }}
      onTouchEnd={(e) => restoreStyle(e.currentTarget)}
      onTouchCancel={(e) => restoreStyle(e.currentTarget)}
      {...rest}
    >
      {children}
    </button>
  );
}
