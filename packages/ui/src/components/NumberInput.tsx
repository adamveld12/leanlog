import { useState } from 'react';
import { Input } from './Input';

type NumberInputProps = {
  label: string;
  value: number;
  onChange: (next: number) => void;
  onBlur?: () => void;
};

export function NumberInput({ label, value, onChange, onBlur }: NumberInputProps) {
  const [text, setText] = useState(String(value));
  const [editing, setEditing] = useState(false);

  return (
    <label className="ll-field">
      <span>{label}</span>
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
      />
    </label>
  );
}
