import type { HTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

type TextVariant = keyof typeof recipes.text;
type TextProps = PropsWithChildren<HTMLAttributes<HTMLElement>> & {
  variant?: TextVariant;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'small';
};
export function Text({
  as = 'span',
  variant = 'body',
  className = '',
  children,
  ...props
}: TextProps) {
  const Component = as;
  return (
    <Component className={cn(recipes.text[variant], className)} {...props}>
      {children}
    </Component>
  );
}
