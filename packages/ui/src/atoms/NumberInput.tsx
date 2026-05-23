import { useState } from 'react';
import { Field } from './Field';
import { Input } from './Input';

type NumberInputProps = {
  label: string;
  value: number;
  onChange: (next: number) => void;
  onBlur?: () => void;
  labelClassName?: string;
  inputClassName?: string;
};

export function NumberInput({
  label,
  value,
  onChange,
  onBlur,
  labelClassName = '',
  inputClassName = '',
}: NumberInputProps) {
  const [text, setText] = useState(String(value));
  const [editing, setEditing] = useState(false);

  return (
    <Field label={label} className={labelClassName}>
      <Input
        value={editing ? text : String(value)}
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
          setText(String(value));
        }}
        onBlur={() => {
          setEditing(false);
          setText(String(value));
          onBlur?.();
        }}
        inputMode="decimal"
        className={inputClassName}
      />
    </Field>
  );
}
