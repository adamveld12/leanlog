import type { InputHTMLAttributes, ReactNode } from 'react';
import { useAnalytics } from '../analytics';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

type CheckboxBaseProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

// A Checkbox must have an accessible name: either a visible `label` or an `aria-label`.
type CheckboxProps = CheckboxBaseProps &
  ({ label: ReactNode } | { label?: undefined; 'aria-label': string });

export function Checkbox({
  className = '',
  label,
  name,
  checked,
  onChange,
  ...props
}: CheckboxProps) {
  const track = useAnalytics();
  return (
    <label className="-m-2.5 flex items-center gap-2 p-2.5 text-sm font-medium text-[var(--ll-text)]">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        className={cn(
          'h-4 w-4 accent-[var(--ll-text)]',
          recipes.focusRing,
          recipes.controlDisabled,
          className,
        )}
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
