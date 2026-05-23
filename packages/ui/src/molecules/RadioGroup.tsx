import { Field } from '../atoms/Field';
import { Radio } from '../atoms/Radio';

type RadioOption<T extends string> = { value: T; label: string };

type RadioGroupProps<T extends string> = {
  name: string;
  label: string;
  value: T;
  options: RadioOption<T>[];
  onChange: (next: T) => void;
};

export function RadioGroup<T extends string>({
  name,
  label,
  value,
  options,
  onChange,
}: RadioGroupProps<T>) {
  return (
    <fieldset className="flex flex-col gap-1.5 text-xs font-medium text-[var(--ll-text-muted)]">
      <legend>{label}</legend>
      <div className="flex flex-col gap-2.5">
        {options.map((option) => (
          <Field key={option.value} className="flex-row items-center gap-2">
            <Radio
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span className="text-sm text-[var(--ll-text)]">{option.label}</span>
          </Field>
        ))}
      </div>
    </fieldset>
  );
}
