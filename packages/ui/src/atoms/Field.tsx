import type { PropsWithChildren, ReactNode } from 'react';
import { cn } from '../styles/cn';
import { HelperText } from './HelperText';
import { Label } from './Label';
import { WarningText } from './WarningText';

export type FieldProps = PropsWithChildren<{
  label?: ReactNode;
  helperText?: ReactNode;
  errorText?: ReactNode;
  className?: string;
}>;
export function Field({ label, helperText, errorText, className = '', children }: FieldProps) {
  return (
    <Label className={cn(className)}>
      {label ? <span>{label}</span> : null}
      {children}
      {helperText ? <HelperText>{helperText}</HelperText> : null}
      {errorText ? <WarningText>{errorText}</WarningText> : null}
    </Label>
  );
}
