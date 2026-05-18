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
    <fieldset className="ll-field">
      <legend>{label}</legend>
      <div className="ll-stack">
        {options.map((option) => (
          <label key={option.value} className="ll-row">
            <input
              type="radio"
              name={name}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span className="text-sm">{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
