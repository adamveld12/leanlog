import type { PropsWithChildren } from 'react';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

export function ActionRow({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn(recipes.stack.row, className)}>{children}</div>;
}
