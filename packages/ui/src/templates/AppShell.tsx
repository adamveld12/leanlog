import type { PropsWithChildren } from 'react';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

export function AppShell({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <main className={cn(recipes.page.shell, recipes.page.main, className)}>{children}</main>;
}
