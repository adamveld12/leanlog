import type { PropsWithChildren } from 'react';
import { cn } from '../styles/cn';

export function ActionRow({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('flex items-center gap-2', className)}>{children}</div>;
}
