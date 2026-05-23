import { forwardRef, type InputHTMLAttributes } from 'react';
import { useAnalytics } from '../analytics';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  normalizeOnBlur?: (value: string) => string;
  onNormalized?: (value: string) => void;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', normalizeOnBlur, onNormalized, onBlur, onChange, name, ...props },
  ref,
) {
  const track = useAnalytics();
  return (
    <input
      ref={ref}
      className={cn(recipes.input.base, className)}
      name={name}
      onChange={(e) => {
        track('ui.input.change', { atom: 'Input', name, value: e.currentTarget.value });
        onChange?.(e);
      }}
      onBlur={(e) => {
        const normalized = normalizeOnBlur ? normalizeOnBlur(e.target.value) : e.target.value;
        if (normalizeOnBlur) {
          e.currentTarget.value = normalized;
          onNormalized?.(normalized);
        }
        track('ui.input.blur', { atom: 'Input', name, value: e.currentTarget.value });
        onBlur?.(e);
      }}
      {...props}
    />
  );
});
