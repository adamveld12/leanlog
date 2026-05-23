import type { HTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

export function HelperText({
  children,
  className = '',
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLElement>>) {
  return (
    <small className={cn(recipes.text.meta, className)} {...props}>
      {children}
    </small>
  );
}
