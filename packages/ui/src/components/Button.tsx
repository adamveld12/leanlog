import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
  variant?: 'primary' | 'ghost' | 'danger';
};

export function Button({ children, className = '', variant = 'primary', ...props }: ButtonProps) {
  const colors = {
    primary: { background: '#171717', color: '#fff' },
    ghost: { background: '#e5e5e5', color: '#171717' },
    danger: { background: '#dc2626', color: '#fff' },
  }[variant];

  return (
    <button
      className={className}
      style={{
        height: 44,
        borderRadius: 12,
        border: 0,
        padding: '0 16px',
        fontSize: 14,
        fontWeight: 500,
        cursor: 'pointer',
        ...colors,
      }}
      {...props}
    >
      {children}
    </button>
  );
}
