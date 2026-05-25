import type { LabelHTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../styles/cn';

export function Label({
  children,
  className = '',
  ...props
}: PropsWithChildren<LabelHTMLAttributes<HTMLLabelElement>>) {
  return (
    <label
      className={cn(
        'flex flex-col gap-1.5 text-xs font-medium text-[var(--ll-text-muted)]',
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}
