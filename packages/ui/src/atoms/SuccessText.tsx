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
    // Defaults announce transient confirmations to assistive tech; callers can
    // override (e.g. role="alert") via props.
    <small
      role="status"
      aria-live="polite"
      className={cn(recipes.text.success, className)}
      {...props}
    >
      {children}
    </small>
  );
}
