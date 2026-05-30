import type { InputHTMLAttributes, ReactNode } from 'react';
import { useAnalytics } from '../analytics';
import { cn } from '../styles/cn';

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
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-[var(--ll-text)]">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        className={cn(
          'h-4 w-4 accent-[var(--ll-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--ll-focus)_35%,transparent)]',
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
