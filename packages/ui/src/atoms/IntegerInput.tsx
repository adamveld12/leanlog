import type { InputHTMLAttributes } from 'react';
import { Input } from './Input';

type IntegerInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange'
> & {
  value: number;
  onChange: (next: number) => void;
};

export function IntegerInput({ value, onChange, min = 0, step = 1, ...props }: IntegerInputProps) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      min={min}
      step={step}
      value={String(value)}
      onChange={(event) => {
        const parsed = Number.parseInt(event.currentTarget.value, 10);
        const minNumber = typeof min === 'number' ? min : Number(min);
        const next = Number.isNaN(parsed) ? minNumber || 0 : Math.max(minNumber || 0, parsed);
        onChange(next);
      }}
      {...props}
    />
  );
}
