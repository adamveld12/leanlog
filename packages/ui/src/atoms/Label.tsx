import type { LabelHTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

export function Label({
  children,
  className = '',
  ...props
}: PropsWithChildren<LabelHTMLAttributes<HTMLLabelElement>>) {
  return (
    <label className={cn('flex flex-col gap-1.5', recipes.text.label, className)} {...props}>
      {children}
    </label>
  );
}
