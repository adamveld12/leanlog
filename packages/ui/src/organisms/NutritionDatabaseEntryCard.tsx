import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Button } from '../atoms/Button';
import { Field } from '../atoms/Field';
import { HelperText } from '../atoms/HelperText';
import { Input } from '../atoms/Input';
import { NumberInput } from '../atoms/NumberInput';
import { SectionHeading } from '../atoms/SectionHeading';
import { WarningText } from '../atoms/WarningText';
import { SectionCard } from '../molecules/SectionCard';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

export type NutritionDatabaseMicronutrientValue = {
  name: string;
  percentDailyValue?: number | null;
  amount?: number | null;
  unit?: string;
};

export type NutritionDatabaseEntryValue = {
  name: string;
  servingAmount: number | null;
  calories: number | null;
  fat: number | null;
  carbs: number | null;
  protein: number | null;
  saturatedFat?: number | null;
  unsaturatedFat?: number | null;
  monounsaturatedFat?: number | null;
  polyunsaturatedFat?: number | null;
  transFat?: number | null;
  fiber?: number | null;
  sugar?: number | null;
  sugarAlcohol?: number | null;
  allulose?: number | null;
  alcohol?: number | null;
  micronutrients?: NutritionDatabaseMicronutrientValue[];
};

type NutritionDatabaseEntryCardProps = {
  value: NutritionDatabaseEntryValue;
  estimatedCalories: number;
  onChange: (next: NutritionDatabaseEntryValue) => void;
  onSubmit: () => void;
  submitting?: boolean;
};

const clamp999 = (n: number) => Math.max(0, Math.min(999, n));
const clamp9999 = (n: number) => Math.max(0, Math.min(9999, n));
const round1 = (n: number) => Math.round(n * 10) / 10;
const sanitize = (n: number | null) => (n == null ? null : round1(clamp999(n)));
const sanitizeCalories = (n: number | null) => (n == null ? null : round1(clamp9999(n)));

function isValid(value: NutritionDatabaseEntryValue): boolean {
  return (
    value.name.trim().length > 0 &&
    value.servingAmount != null &&
    value.servingAmount > 0 &&
    value.calories != null &&
    value.fat != null &&
    value.carbs != null &&
    value.protein != null
  );
}

function missingFields(value: NutritionDatabaseEntryValue): string[] {
  const missing: string[] = [];
  if (!value.name.trim()) missing.push('Name');
  if (value.servingAmount == null || !(value.servingAmount > 0))
    missing.push('Serving amount (must be > 0)');
  if (value.calories == null) missing.push('Calories');
  if (value.fat == null) missing.push('Fat');
  if (value.carbs == null) missing.push('Carbs');
  if (value.protein == null) missing.push('Protein');
  return missing;
}

export function NutritionDatabaseEntryCard({
  value,
  estimatedCalories,
  onChange,
  onSubmit,
  submitting,
}: NutritionDatabaseEntryCardProps) {
  const setNum = (
    key: Exclude<keyof NutritionDatabaseEntryValue, 'name' | 'calories' | 'micronutrients'>,
    n: number | null,
  ) => onChange({ ...value, [key]: sanitize(n) });

  const roundField = (
    key: Exclude<keyof NutritionDatabaseEntryValue, 'name' | 'calories' | 'micronutrients'>,
  ) => {
    const v = value[key];
    if (typeof v === 'number') onChange({ ...value, [key]: sanitize(v) });
  };

  const fiberInvalid = (value.fiber ?? 0) > (value.carbs ?? 0);
  const missing = missingFields(value);
  const valid = isValid(value) && !fiberInvalid;

  const calorieDisplay =
    value.calories != null && Math.round(value.calories) !== Math.round(estimatedCalories)
      ? `Calories: ${Math.round(value.calories)} kcal · Estimated: ${Math.round(estimatedCalories)} kcal`
      : `Estimated calories: ${Math.round(estimatedCalories)} kcal`;

  // Micronutrient helpers
  const micronutrients = value.micronutrients ?? [];

  const updateMicro = (idx: number, patch: Partial<NutritionDatabaseMicronutrientValue>) => {
    const next = micronutrients.map((m, i) => (i === idx ? { ...m, ...patch } : m));
    onChange({ ...value, micronutrients: next });
  };

  const addMicro = () => onChange({ ...value, micronutrients: [...micronutrients, { name: '' }] });

  const removeMicro = (idx: number) =>
    onChange({ ...value, micronutrients: micronutrients.filter((_, i) => i !== idx) });

  return (
    <AnalyticsScope properties={{ organism: 'NutritionDatabaseEntryCard' }}>
      <SectionCard>
        <div className={cn(recipes.stack.row, recipes.stack.between)}>
          <SectionHeading noMargin>Publish Ingredient</SectionHeading>
          <Button size="sm" onClick={onSubmit} disabled={!valid || submitting}>
            {submitting ? 'Publishing…' : 'Publish'}
          </Button>
        </div>

        {missing.length > 0 ? (
          <WarningText role="alert">Required: {missing.join(', ')}</WarningText>
        ) : null}

        <Field label="Name">
          <Input
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
          />
        </Field>
        <HelperText as="p">{calorieDisplay}</HelperText>

        <NumberInput
          label="Serving amount (g/ml)"
          value={value.servingAmount}
          onChange={(n) => setNum('servingAmount', n)}
          onBlur={() => roundField('servingAmount')}
        />

        <NumberInput
          label="Calories (kcal)"
          value={value.calories}
          onChange={(n) => onChange({ ...value, calories: sanitizeCalories(n) })}
          onBlur={() => onChange({ ...value, calories: sanitizeCalories(value.calories) })}
        />

        <div className={recipes.grid.two}>
          <NumberInput
            label="Fat (g)"
            value={value.fat}
            onChange={(n) => setNum('fat', n)}
            onBlur={() => roundField('fat')}
          />
          <NumberInput
            label="Carbs (g)"
            value={value.carbs}
            onChange={(n) => setNum('carbs', n)}
            onBlur={() => roundField('carbs')}
          />
        </div>

        <div className={recipes.grid.carbFiber}>
          <NumberInput
            label="Protein (g)"
            value={value.protein}
            onChange={(n) => setNum('protein', n)}
            onBlur={() => roundField('protein')}
          />
          <NumberInput
            label="Fiber (g)"
            value={value.fiber ?? null}
            onChange={(n) => onChange({ ...value, fiber: sanitize(n) })}
            onBlur={() => roundField('fiber')}
            inputClassName={fiberInvalid ? 'border-[var(--ll-danger)]' : ''}
          />
        </div>
        {fiberInvalid ? <WarningText role="alert">Fiber cannot exceed carbs.</WarningText> : null}

        <SectionHeading noMargin>Optional Details</SectionHeading>
        <div className={recipes.grid.two}>
          <NumberInput
            label="Saturated fat (g)"
            value={value.saturatedFat ?? null}
            onChange={(n) => onChange({ ...value, saturatedFat: sanitize(n) })}
          />
          <NumberInput
            label="Unsaturated fat (g)"
            value={value.unsaturatedFat ?? null}
            onChange={(n) => onChange({ ...value, unsaturatedFat: sanitize(n) })}
          />
          <NumberInput
            label="Monounsaturated fat (g)"
            value={value.monounsaturatedFat ?? null}
            onChange={(n) => onChange({ ...value, monounsaturatedFat: sanitize(n) })}
          />
          <NumberInput
            label="Polyunsaturated fat (g)"
            value={value.polyunsaturatedFat ?? null}
            onChange={(n) => onChange({ ...value, polyunsaturatedFat: sanitize(n) })}
          />
          <NumberInput
            label="Trans fat (g)"
            value={value.transFat ?? null}
            onChange={(n) => onChange({ ...value, transFat: sanitize(n) })}
          />
          <NumberInput
            label="Sugar (g)"
            value={value.sugar ?? null}
            onChange={(n) => onChange({ ...value, sugar: sanitize(n) })}
          />
          <NumberInput
            label="Sugar alcohol (g)"
            value={value.sugarAlcohol ?? null}
            onChange={(n) => onChange({ ...value, sugarAlcohol: sanitize(n) })}
          />
          <NumberInput
            label="Allulose (g)"
            value={value.allulose ?? null}
            onChange={(n) => onChange({ ...value, allulose: sanitize(n) })}
          />
          <NumberInput
            label="Alcohol (g)"
            value={value.alcohol ?? null}
            onChange={(n) => onChange({ ...value, alcohol: sanitize(n) })}
          />
        </div>

        <div className={cn(recipes.stack.row, recipes.stack.between)}>
          <SectionHeading noMargin>Micronutrients</SectionHeading>
          <Button variant="subtle" size="sm" onClick={addMicro} type="button">
            Add row
          </Button>
        </div>

        {micronutrients.length > 0 ? (
          <div className={recipes.stack.sm}>
            {micronutrients.map((micro, idx) => (
              <div key={idx} className={cn(recipes.stack.row, 'items-end')}>
                <div className="flex-1">
                  <Field label="Name">
                    <Input
                      value={micro.name}
                      onChange={(e) => updateMicro(idx, { name: e.target.value })}
                      placeholder="e.g. Vitamin C"
                    />
                  </Field>
                </div>
                <div className="w-24 shrink-0">
                  <NumberInput
                    label="% DV"
                    value={micro.percentDailyValue ?? null}
                    onChange={(n) =>
                      updateMicro(idx, {
                        percentDailyValue:
                          n == null ? null : Math.max(0, Math.min(999, Math.round(n * 10) / 10)),
                      })
                    }
                    placeholder="0–999"
                  />
                </div>
                <div className="w-20 shrink-0">
                  <NumberInput
                    label="Amount"
                    value={micro.amount ?? null}
                    onChange={(n) => updateMicro(idx, { amount: n })}
                  />
                </div>
                <div className="w-20 shrink-0">
                  <Field label="Unit">
                    <Input
                      value={micro.unit ?? ''}
                      onChange={(e) => updateMicro(idx, { unit: e.target.value })}
                      placeholder="mg"
                    />
                  </Field>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMicro(idx)}
                  type="button"
                  className="shrink-0 self-end"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </SectionCard>
    </AnalyticsScope>
  );
}
