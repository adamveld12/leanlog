import type { InputHTMLAttributes } from 'react';
import { useAnalytics } from '../analytics';
import { cn } from '../styles/cn';

type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export function Radio({ className = '', name, value, onChange, ...props }: RadioProps) {
  const track = useAnalytics();
  return (
    <input
      type="radio"
      name={name}
      value={value}
      className={cn(
        'accent-[var(--ll-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--ll-focus)_35%,transparent)]',
        className,
      )}
      onChange={(event) => {
        track('ui.radio.change', { atom: 'Radio', name, value: String(value ?? '') });
        onChange?.(event);
      }}
      {...props}
    />
  );
}
