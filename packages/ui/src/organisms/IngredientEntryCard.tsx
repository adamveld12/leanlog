import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Button } from '../atoms/Button';
import { Field } from '../atoms/Field';
import { Input } from '../atoms/Input';
import { NumberInput } from '../atoms/NumberInput';
import { SectionHeading } from '../atoms/SectionHeading';
import { WarningText } from '../atoms/WarningText';
import { SectionCard } from '../molecules/SectionCard';
import { recipes } from '../styles/recipes';

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
    <AnalyticsScope properties={{ organism: 'IngredientEntryCard' }}>
      <SectionCard saved={saved}>
        <div className="flex items-center gap-2 justify-between">
          <SectionHeading noMargin>Ingredient Entry</SectionHeading>
          <Button size="sm" onClick={onSubmit} disabled={fiberInvalid}>
            {submitLabel}
          </Button>
        </div>

        <Field label="Ingredient Name">
          <Input
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            normalizeOnBlur={normalizeNameOnBlur}
            onNormalized={(name) => onChange({ ...value, name })}
          />
        </Field>

        <div className={recipes.grid.two}>
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

        <div className={recipes.grid.two}>
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

        <div className={recipes.grid.carbFiber}>
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
            labelClassName="text-[11px]"
            inputClassName={fiberInvalid ? 'border-[var(--ll-danger)]' : ''}
          />
        </div>
        {fiberInvalid ? <WarningText>Fiber cannot exceed carbs.</WarningText> : null}

        <NumberInput
          label="Protein"
          value={value.protein}
          onChange={(n) => setNum('protein', n)}
          onBlur={() => roundField('protein')}
        />
      </SectionCard>
    </AnalyticsScope>
  );
}
