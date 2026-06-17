import type { HTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

// Small confirmation text in the saved/green color, the success counterpart to
// WarningText (e.g. "Goal created").
export function SuccessText({
  children,
  className = '',
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLElement>>) {
  return (
    <small className={cn(recipes.text.success, className)} {...props}>
      {children}
    </small>
  );
}
