import type { SelectHTMLAttributes } from 'react';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';
import { useAnalytics } from '../analytics/AnalyticsProvider';

export function Select({
  className = '',
  name,
  onChange,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const track = useAnalytics();
  return (
    <select
      className={cn(recipes.input.base, className)}
      name={name}
      onChange={(e) => {
        track('ui.select.change', { atom: 'Select', name, value: e.currentTarget.value });
        onChange?.(e);
      }}
      {...props}
    />
  );
}
