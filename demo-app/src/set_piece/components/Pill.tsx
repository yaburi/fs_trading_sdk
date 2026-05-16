import type { ButtonHTMLAttributes, ReactNode } from 'react';

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
  md: { padding: '10px 20px', fontSize: '14px', minHeight: '40px' },
  lg: { padding: '14px 28px', fontSize: '16px', minHeight: '52px' },
};

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

  const variantStyles: Record<Variant, React.CSSProperties> = {
    primary: {
      background: 'var(--sp-primary)',
      color: 'var(--sp-on-primary)',
    },
    secondary: {
      background: 'var(--sp-surface)',
      color: 'var(--sp-text)',
      boxShadow: 'inset 0 0 0 1px var(--sp-border)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--sp-text-secondary)',
    },
    accent: {
      background: 'var(--sp-accent)',
      color: 'var(--sp-on-accent)',
    },
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
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'transform 0.12s var(--sp-ease), opacity 0.15s var(--sp-ease)',
        ...dims,
        ...variantStyles[variant],
        ...style,
      }}
      onMouseDown={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)';
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
