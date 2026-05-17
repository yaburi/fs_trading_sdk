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
      // Deep near-black ink. Strong top sheen, deeper ambient + cast shadows
      // so the pebble reads as substantially raised off the surface.
      background:
        'linear-gradient(180deg, #2E2E30 0%, #161618 55%, #060608 100%)',
      color: 'var(--sp-on-primary)',
      boxShadow: [
        'inset 0 1px 0 rgba(255,255,255,0.22)',
        'inset 0 0 0 1px rgba(0,0,0,0.7)',
        '0 2px 4px rgba(0,0,0,0.22)',
        '0 8px 18px rgba(0,0,0,0.18)',
      ].join(', '),
      textShadow: '0 -1px 0 rgba(0,0,0,0.45)',
    },
    accent: {
      // Warm coral with a heated highlight. Reads like a hot enamel pin —
      // appropriate for the "GOAL!" CTA on the confirm screen.
      background:
        'linear-gradient(180deg, #FF9572 0%, #FF6B3D 55%, #DD4E27 100%)',
      color: 'var(--sp-on-accent)',
      boxShadow: [
        'inset 0 1px 0 rgba(255,255,255,0.5)',
        'inset 0 0 0 1px rgba(180,60,15,0.55)',
        '0 2px 6px rgba(226, 84, 43, 0.4)',
        '0 10px 22px rgba(226, 84, 43, 0.26)',
      ].join(', '),
      textShadow: '0 -1px 0 rgba(120, 30, 0, 0.4)',
    },
    secondary: {
      // Bright porcelain card. Crisp top highlight, hairline edge, layered
      // soft drop — sits firmly on the surface, not floating.
      background:
        'linear-gradient(180deg, #FFFFFF 0%, #F1F1F3 100%)',
      color: 'var(--sp-text)',
      boxShadow: [
        'inset 0 1px 0 rgba(255,255,255,1)',
        'inset 0 0 0 1px rgba(0,0,0,0.09)',
        '0 1px 2px rgba(0,0,0,0.08)',
        '0 5px 12px rgba(0,0,0,0.06)',
      ].join(', '),
    },
    ghost: {
      // No surface, no shadow — pure text affordance. Hover/active still get
      // a faint inset surface to confirm the touch.
      background: 'transparent',
      color: 'var(--sp-text-secondary)',
      boxShadow: 'none',
    },
  };

  // Style applied while the pointer is over the button (but not pressed).
  // Each variant brightens its gradient one stop and grows the drop shadow
  // — so the surface reads as "a light just hit it" without the button
  // physically moving toward the cursor. Gated to true mouse pointers below.
  const hoverStyles: Record<Variant, CSSProperties> = {
    primary: {
      background:
        'linear-gradient(180deg, #3C3C3F 0%, #1D1D20 55%, #0B0B0D 100%)',
      boxShadow: [
        'inset 0 1px 0 rgba(255,255,255,0.28)',
        'inset 0 0 0 1px rgba(0,0,0,0.7)',
        '0 4px 10px rgba(0,0,0,0.28)',
        '0 14px 28px rgba(0,0,0,0.22)',
      ].join(', '),
    },
    accent: {
      background:
        'linear-gradient(180deg, #FFA98E 0%, #FF7A50 55%, #E25530 100%)',
      boxShadow: [
        'inset 0 1px 0 rgba(255,255,255,0.6)',
        'inset 0 0 0 1px rgba(180,60,15,0.55)',
        '0 4px 12px rgba(226, 84, 43, 0.5)',
        '0 16px 32px rgba(226, 84, 43, 0.3)',
      ].join(', '),
    },
    secondary: {
      background:
        'linear-gradient(180deg, #FFFFFF 0%, #F7F7F9 100%)',
      boxShadow: [
        'inset 0 1px 0 rgba(255,255,255,1)',
        'inset 0 0 0 1px rgba(0,0,0,0.11)',
        '0 2px 5px rgba(0,0,0,0.1)',
        '0 10px 22px rgba(0,0,0,0.08)',
      ].join(', '),
    },
    ghost: {
      background: 'rgba(15,15,16,0.05)',
      boxShadow: 'inset 0 1px 1.5px rgba(0,0,0,0.04)',
    },
  };

  // Style applied during the brief mousedown depressed state. The button
  // collapses its drop shadow and flips to an inset shadow so it reads as
  // "pushed in" — no translation, all visual. Pairs with the scale(0.97)
  // applied below for the mechanical squish.
  const pressedStyles: Record<Variant, CSSProperties> = {
    primary: {
      background:
        'linear-gradient(180deg, #101012 0%, #040406 100%)',
      boxShadow: [
        'inset 0 2px 3px rgba(0,0,0,0.5)',
        'inset 0 -1px 0 rgba(255,255,255,0.06)',
        'inset 0 0 0 1px rgba(0,0,0,0.7)',
        '0 1px 0 rgba(255,255,255,0.35)',
      ].join(', '),
    },
    accent: {
      background:
        'linear-gradient(180deg, #D14E26 0%, #B83E16 100%)',
      boxShadow: [
        'inset 0 2px 3px rgba(120,30,0,0.5)',
        'inset 0 -1px 0 rgba(255,255,255,0.2)',
        'inset 0 0 0 1px rgba(180,60,15,0.65)',
        '0 1px 0 rgba(255,255,255,0.4)',
      ].join(', '),
    },
    secondary: {
      background:
        'linear-gradient(180deg, #EBEBED 0%, #F7F7F8 100%)',
      boxShadow: [
        'inset 0 2px 3px rgba(0,0,0,0.1)',
        'inset 0 -1px 0 rgba(255,255,255,0.6)',
        'inset 0 0 0 1px rgba(0,0,0,0.1)',
      ].join(', '),
    },
    ghost: {
      background: 'rgba(0,0,0,0.07)',
      boxShadow: 'inset 0 1.5px 3px rgba(0,0,0,0.06)',
    },
  };

  const restoreStyle = (el: HTMLButtonElement) => {
    const base = variantStyles[variant];
    el.style.transform = '';
    if (base.background) el.style.background = base.background as string;
    if (base.boxShadow) el.style.boxShadow = base.boxShadow as string;
  };

  const applyHover = (el: HTMLButtonElement) => {
    const hover = hoverStyles[variant];
    // No movement — the brightened gradient + grown shadow do all the work,
    // so the button reads as "lit" not "lifted".
    el.style.transform = '';
    if (hover.background) el.style.background = hover.background as string;
    if (hover.boxShadow) el.style.boxShadow = hover.boxShadow as string;
  };

  const applyPress = (el: HTMLButtonElement) => {
    const press = pressedStyles[variant];
    // Centered scale-down for the mechanical squish; the inset shadow flip
    // in pressedStyles is what sells "pushed in". No translateY — staying
    // put keeps the button anchored under the cursor.
    el.style.transform = 'scale(0.97)';
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
      onPointerEnter={(e) => {
        // Gate hover to true mouse pointers so a tap on a touch device
        // doesn't briefly flash the hover state before the press kicks in.
        if (!disabled && e.pointerType === 'mouse') applyHover(e.currentTarget);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') restoreStyle(e.currentTarget);
      }}
      onMouseDown={(e) => {
        if (!disabled) applyPress(e.currentTarget);
      }}
      onMouseUp={(e) => {
        // After a press, drop back to hover state (mouse is still over the
        // button); the next pointerLeave restores base.
        if (!disabled) applyHover(e.currentTarget);
        else restoreStyle(e.currentTarget);
      }}
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
