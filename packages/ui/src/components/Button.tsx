import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
  size?: 'md' | 'sm';
};

export function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps) {
  const variantClass = {
    primary: 'll-btn-primary',
    secondary: 'll-btn-secondary',
    ghost: 'll-btn-ghost',
    danger: 'll-btn-danger',
    subtle: 'll-btn-subtle',
  }[variant];

  const sizeClass = size === 'sm' ? 'll-btn-sm' : 'll-btn-md';

  return (
    <button className={`ll-btn ${sizeClass} ${variantClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
