import type { PropsWithChildren, ReactNode } from 'react';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

export type FieldProps = PropsWithChildren<{
  label?: ReactNode;
  helperText?: ReactNode;
  errorText?: ReactNode;
  className?: string;
}>;
export function Field({ label, helperText, errorText, className = '', children }: FieldProps) {
  return (
    <label
      className={cn(
        'flex flex-col gap-1.5 text-xs font-medium text-[var(--ll-text-muted)]',
        className,
      )}
    >
      {label ? <span>{label}</span> : null}
      {children}
      {helperText ? <small className={recipes.text.meta}>{helperText}</small> : null}
      {errorText ? <small className={recipes.text.warn}>{errorText}</small> : null}
    </label>
  );
}
