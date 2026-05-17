import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
  variant?: 'primary' | 'ghost' | 'danger';
};

export function Button({ children, className = '', variant = 'primary', ...props }: ButtonProps) {
  const variantClass = {
    primary: 'll-btn-primary',
    ghost: 'll-btn-ghost',
    danger: 'll-btn-danger',
  }[variant];

  return (
    <button className={`ll-btn ${variantClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
