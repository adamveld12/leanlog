import type { HTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

type HelperTextProps = PropsWithChildren<HTMLAttributes<HTMLElement>> & {
  as?: 'small' | 'p' | 'span';
};

export function HelperText({ as = 'small', children, className = '', ...props }: HelperTextProps) {
  const Component = as;
  return (
    <Component className={cn(recipes.text.meta, className)} {...props}>
      {children}
    </Component>
  );
}
