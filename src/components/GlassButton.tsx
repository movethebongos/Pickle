import type { ButtonHTMLAttributes, ReactNode } from 'react';

type GlassButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  block?: boolean;
  compact?: boolean;
  accent?: boolean;
  active?: boolean;
};

export default function GlassButton({
  children,
  block = false,
  compact = false,
  accent = false,
  active = false,
  className = '',
  type = 'button',
  ...props
}: GlassButtonProps) {
  const wrapClass = [
    'glass-button-wrap',
    block ? 'glass-button-wrap--block' : '',
    compact ? 'glass-button-wrap--compact' : '',
    accent ? 'glass-button-wrap--accent' : '',
    active ? 'glass-button-wrap--active' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapClass}>
      <button type={type} className="glass-button" {...props}>
        <span className="glass-button__label">{children}</span>
      </button>
      <div className="glass-button-shadow" aria-hidden="true" />
    </div>
  );
}
