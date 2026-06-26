import { useState } from 'react';
import { cn } from '../styles/cn';
import { Field } from './Field';
import { Input } from './Input';

type NumberInputProps = {
  label: string;
  value: number | null;
  onChange: (next: number | null) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  labelClassName?: string;
  inputClassName?: string;
  /** Allow a leading minus sign for negative values (e.g. calorie deltas). */
  allowNegative?: boolean;
};

function display(value: number | null): string {
  return value == null ? '' : String(value);
}

export function NumberInput({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
  labelClassName = '',
  inputClassName = '',
  allowNegative = false,
}: NumberInputProps) {
  const [text, setText] = useState(() => display(value));
  const [editing, setEditing] = useState(false);
  // Optionally permit a single leading minus so deltas can go negative.
  const pattern = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;

  return (
    <Field label={label} className={labelClassName} labelClassName={cn(disabled && 'opacity-50')}>
      <Input
        value={editing ? text : display(value)}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          if (next.trim() === '') {
            onChange(null);
            return;
          }
          if (!pattern.test(next)) return;
          // Intermediate states with no parseable number yet (e.g. "-", "1.").
          if (next === '-' || next === '.' || next === '-.' || next.endsWith('.')) return;
          const parsed = Number(next);
          if (!Number.isNaN(parsed)) onChange(parsed);
        }}
        onFocus={() => {
          setEditing(true);
          setText(display(value));
        }}
        onBlur={() => {
          setEditing(false);
          setText(display(value));
          onBlur?.();
        }}
        inputMode="decimal"
        className={inputClassName}
      />
    </Field>
  );
}
