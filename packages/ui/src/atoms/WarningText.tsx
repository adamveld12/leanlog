import type { HTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

export function WarningText({
  children,
  className = '',
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLElement>>) {
  return (
    <small className={cn(recipes.text.warn, className)} {...props}>
      {children}
    </small>
  );
}
