import type { HTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

type SectionHeadingProps = PropsWithChildren<HTMLAttributes<HTMLHeadingElement>> & {
  as?: 'h2' | 'h3' | 'h4';
};

export function SectionHeading({
  as = 'h3',
  children,
  className = '',
  ...props
}: SectionHeadingProps) {
  const Component = as;
  return (
    <Component className={cn(recipes.text.sectionHeading, className)} {...props}>
      {children}
    </Component>
  );
}
