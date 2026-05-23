import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { useAnalytics } from '../analytics';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
  size?: 'md' | 'sm';
  analyticsName?: string;
};

export function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  analyticsName,
  name,
  value,
  onClick,
  ...props
}: ButtonProps) {
  const track = useAnalytics();
  return (
    <button
      className={cn(
        recipes.control.base,
        recipes.control.size[size],
        recipes.radius.control,
        recipes.transition,
        recipes.focusRing,
        'active:scale-[0.98]',
        recipes.button[variant],
        className,
      )}
      name={name}
      value={value}
      onClick={(event) => {
        track('ui.button.click', {
          atom: 'Button',
          name: analyticsName ?? name,
          value: typeof value === 'string' || typeof value === 'number' ? value : undefined,
          variant,
          text: typeof children === 'string' ? children : undefined,
        });
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </button>
  );
}
