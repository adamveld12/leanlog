import type { InputHTMLAttributes } from 'react';
import { useAnalytics } from '../analytics/AnalyticsProvider';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export function Radio({ className = '', name, value, onChange, ...props }: RadioProps) {
  const track = useAnalytics();
  return (
    <input
      type="radio"
      name={name}
      value={value}
      className={cn(
        'accent-[var(--ll-text)]',
        recipes.focusRing,
        recipes.controlDisabled,
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
