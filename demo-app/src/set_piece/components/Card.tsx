import type { CSSProperties, ReactNode, MouseEventHandler } from 'react';

interface CardProps {
  children: ReactNode;
  /** Tonal: white floating (default) or inset light-gray. */
  tone?: 'surface' | 'inset';
  /** Radius preset. */
  radius?: 'md' | 'lg';
  /** Padding preset. */
  padding?: 'sm' | 'md' | 'lg' | 'none';
  /** Tap handler — when present, the card becomes a button. */
  onClick?: MouseEventHandler<HTMLDivElement>;
  style?: CSSProperties;
  className?: string;
}

const padMap = { sm: '12px', md: '16px', lg: '20px', none: '0' };

export function Card({
  children,
  tone = 'surface',
  radius = 'lg',
  padding = 'lg',
  onClick,
  style,
  className,
}: CardProps) {
  const isInset = tone === 'inset';
  const isTappable = !!onClick;

  return (
    <div
      role={isTappable ? 'button' : undefined}
      tabIndex={isTappable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        isTappable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                (e.currentTarget as HTMLDivElement).click();
              }
            }
          : undefined
      }
      className={className}
      style={{
        background: isInset ? 'var(--sp-surface-2)' : 'var(--sp-surface)',
        borderRadius: radius === 'lg' ? 'var(--sp-radius-lg)' : 'var(--sp-radius-md)',
        padding: padMap[padding],
        boxShadow: isInset ? 'none' : 'var(--sp-shadow-card)',
        border: isInset ? '1px solid var(--sp-border-subtle)' : 'none',
        cursor: isTappable ? 'pointer' : 'default',
        transition: 'transform 0.15s var(--sp-ease), box-shadow 0.15s var(--sp-ease)',
        ...style,
      }}
      onMouseEnter={
        isTappable
          ? (e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--sp-shadow-pop)';
            }
          : undefined
      }
      onMouseLeave={
        isTappable
          ? (e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--sp-shadow-card)';
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
