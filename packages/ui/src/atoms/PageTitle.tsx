import type { HTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

type PageTitleProps = PropsWithChildren<HTMLAttributes<HTMLHeadingElement>> & { hero?: boolean };

export function PageTitle({ children, className = '', hero = false, ...props }: PageTitleProps) {
  return (
    <h1
      className={cn(
        hero ? 'text-5xl font-semibold tracking-tight md:text-6xl' : recipes.text.title,
        className,
      )}
      {...props}
    >
      {children}
    </h1>
  );
}
