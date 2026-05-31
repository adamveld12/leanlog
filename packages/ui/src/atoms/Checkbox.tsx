import type { InputHTMLAttributes, ReactNode } from 'react';
import { useAnalytics } from '../analytics';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: ReactNode;
};

export function Checkbox({
  className = '',
  label,
  name,
  checked,
  onChange,
  ...props
}: CheckboxProps) {
  const track = useAnalytics();
  if (import.meta.env.DEV && !label && props['aria-label'] == null) {
    console.warn(
      'Checkbox: provide a `label` or `aria-label` so the control has an accessible name.',
    );
  }
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-[var(--ll-text)]">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        className={cn('h-4 w-4 accent-[var(--ll-text)]', recipes.focusRing, className)}
        onChange={(event) => {
          track('ui.checkbox.change', { atom: 'Checkbox', name, value: event.target.checked });
          onChange?.(event);
        }}
        {...props}
      />
      {label ? <span>{label}</span> : null}
    </label>
  );
}
