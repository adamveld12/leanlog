import type { HTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

type CardProps = PropsWithChildren<HTMLAttributes<HTMLElement>> & { saved?: boolean };

export function Card({ children, className = '', saved, ...props }: CardProps) {
  return (
    <section
      className={cn(
        recipes.radius.card,
        recipes.surface.card,
        'p-4',
        saved && 'border-[var(--ll-saved)]',
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}
