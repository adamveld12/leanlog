import { Button } from './Button';
import { Input } from './Input';
import { NumberInput } from './NumberInput';
import { SectionCard } from './SectionCard';

export type IngredientEntryValue = {
  name: string;
  weight: number;
  calories: number;
  fat: number;
  saturatedFat: number;
  carbs: number;
  fiber: number;
  protein: number;
};

type IngredientEntryCardProps = {
  value: IngredientEntryValue;
  saved?: boolean;
  submitLabel: 'Add' | 'Update';
  onChange: (next: IngredientEntryValue) => void;
  onSubmit: () => void;
  normalizeNameOnBlur?: (value: string) => string;
};

const clamp999 = (n: number) => Math.max(0, Math.min(999, n));
const round1 = (n: number) => Math.round(n * 10) / 10;
const sanitize = (n: number) => round1(clamp999(n));

export function IngredientEntryCard({
  value,
  saved,
  submitLabel,
  onChange,
  onSubmit,
  normalizeNameOnBlur,
}: IngredientEntryCardProps) {
  const setNum = (key: keyof Omit<IngredientEntryValue, 'name'>, next: number) =>
    onChange({ ...value, [key]: sanitize(next) });

  const roundField = (key: keyof Omit<IngredientEntryValue, 'name'>) =>
    onChange({ ...value, [key]: sanitize(value[key]) });

  const fiberInvalid = value.fiber > value.carbs;

  return (
    <SectionCard saved={saved}>
      <div className="ll-row ll-between">
        <h3 className="ll-card-title mb-0">Ingredient Entry</h3>
        <Button size="sm" onClick={onSubmit} disabled={fiberInvalid}>
          {submitLabel}
        </Button>
      </div>

      <label className="ll-field">
        <span>Ingredient title</span>
        <Input
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          normalizeOnBlur={normalizeNameOnBlur}
          onNormalized={(name) => onChange({ ...value, name })}
        />
      </label>

      <div className="ll-grid-2">
        <NumberInput
          label="Weight (g)"
          value={value.weight}
          onChange={(n) => setNum('weight', n)}
          onBlur={() => roundField('weight')}
        />
        <NumberInput
          label="Calories"
          value={value.calories}
          onChange={(n) => setNum('calories', n)}
          onBlur={() => roundField('calories')}
        />
      </div>

      <div className="ll-grid-2">
        <NumberInput
          label="Fat"
          value={value.fat}
          onChange={(n) => setNum('fat', n)}
          onBlur={() => roundField('fat')}
        />
        <NumberInput
          label="Saturated fat"
          value={value.saturatedFat}
          onChange={(n) => setNum('saturatedFat', n)}
          onBlur={() => roundField('saturatedFat')}
        />
      </div>

      <div className="ll-grid-carb-fiber">
        <NumberInput
          label="Carbs"
          value={value.carbs}
          onChange={(n) => setNum('carbs', n)}
          onBlur={() => roundField('carbs')}
        />
        <NumberInput
          label="Fiber"
          value={value.fiber}
          onChange={(n) => setNum('fiber', n)}
          onBlur={() => roundField('fiber')}
          labelClassName="ll-field-sm"
          inputClassName={fiberInvalid ? 'll-input-error' : ''}
        />
      </div>
      {fiberInvalid ? <small className="ll-warn">Fiber cannot exceed carbs.</small> : null}

      <NumberInput
        label="Protein"
        value={value.protein}
        onChange={(n) => setNum('protein', n)}
        onBlur={() => roundField('protein')}
      />
    </SectionCard>
  );
}
