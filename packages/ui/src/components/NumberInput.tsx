import { Input } from './Input';

type NumberInputProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  onBlur?: () => void;
};

export function NumberInput({ label, value, onChange, onBlur }: NumberInputProps) {
  return (
    <label className="ll-field">
      <span>{label}</span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        inputMode="decimal"
      />
    </label>
  );
}
