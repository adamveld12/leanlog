import { useState } from 'react';
import { cn } from '../styles/cn';
import { Field } from './Field';
import { Input } from './Input';

type NumberInputProps = {
  label: string;
  value: number | null;
  onChange: (next: number) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  labelClassName?: string;
  inputClassName?: string;
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
}: NumberInputProps) {
  const [text, setText] = useState(display(value));
  const [editing, setEditing] = useState(false);

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
            onChange(0);
            return;
          }
          if (!/^\d*\.?\d*$/.test(next)) return;
          if (next === '.' || next.endsWith('.')) return;
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
