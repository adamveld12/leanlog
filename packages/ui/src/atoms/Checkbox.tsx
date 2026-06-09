import type { InputHTMLAttributes, ReactNode } from 'react';
import { useAnalytics } from '../analytics';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';
import { Text } from './Text';

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
    // -m-3/p-3 expands touch target to 44px
    <label className={cn(recipes.stack.row, '-m-3 p-3')}>
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
      {label ? (
        <Text as="span" variant="body">
          {label}
        </Text>
      ) : null}
    </label>
  );
}
