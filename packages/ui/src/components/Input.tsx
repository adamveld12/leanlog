import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  normalizeOnBlur?: (value: string) => string;
  onNormalized?: (value: string) => void;
};

export function Input({
  className = '',
  normalizeOnBlur,
  onNormalized,
  onBlur,
  ...props
}: InputProps) {
  return (
    <input
      className={`ll-input ${className}`.trim()}
      onBlur={(e) => {
        const normalized = normalizeOnBlur ? normalizeOnBlur(e.target.value) : e.target.value;
        if (normalizeOnBlur) {
          e.currentTarget.value = normalized;
          onNormalized?.(normalized);
        }
        onBlur?.(e);
      }}
      {...props}
    />
  );
}
