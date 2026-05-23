import type { HTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../styles/cn';

export function UnitText({
  children,
  className = '',
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLSpanElement>>) {
  return (
    <span className={cn('text-[var(--ll-text-muted)]', className)} {...props}>
      {children}
    </span>
  );
}
