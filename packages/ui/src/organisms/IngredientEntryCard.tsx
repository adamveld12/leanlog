import { useState } from 'react';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Button } from '../atoms/Button';
import { Field } from '../atoms/Field';
import { Input } from '../atoms/Input';
import { NumberInput } from '../atoms/NumberInput';
import { Select } from '../atoms/Select';
import { SectionHeading } from '../atoms/SectionHeading';
import { WarningText } from '../atoms/WarningText';
import { SectionCard } from '../molecules/SectionCard';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

// Typed nutrient units (kept in sync with @leanlog/data-access NutritionUnitSchema).
const NUTRITION_UNIT_OPTIONS = [
  { value: 'gram', label: 'g' },
  { value: 'milligram', label: 'mg' },
  { value: 'microgram', label: 'mcg' },
  { value: 'milliliter', label: 'ml' },
  { value: 'international_unit', label: 'IU' },
] as const;

// A micronutrient row in the manual form: the user may enter a measured amount +
// unit, or a percent daily value (resolved to an amount on save by the caller).
export type IngredientMicronutrientValue = {
  name: string;
  amount?: number | null;
  unit?: string;
  percentDailyValue?: number | null;
};

export type IngredientEntryValue = {
  name: string;
  weight: number | null;
  calories: number | null;
  fat: number | null;
  saturatedFat: number | null;
  carbs: number | null;
  fiber: number | null;
  protein: number | null;
  sugarAlcohol: number | null;
  allulose: number | null;
  alcohol: number | null;
  micronutrients?: IngredientMicronutrientValue[] | null;
};

type IngredientEntryCardProps = {
  value: IngredientEntryValue;
  estimatedCalories: number;
  saved?: boolean;
  submitLabel: 'Add' | 'Update';
  onChange: (next: IngredientEntryValue) => void;
  onSubmit: () => void;
  /** When provided (e.g. while editing), shows a Cancel button beside submit. */
  onCancel?: () => void;
  normalizeNameOnBlur?: (value: string) => string;
};

const clamp999 = (n: number) => Math.max(0, Math.min(999, n));
const clamp9999 = (n: number) => Math.max(0, Math.min(9999, n));
const round1 = (n: number) => Math.round(n * 10) / 10;
const sanitize = (n: number | null) => (n == null ? null : round1(clamp999(n)));
const sanitizeCalories = (n: number | null) => (n == null ? null : round1(clamp9999(n)));

let microRowSeq = 0;
const nextMicroRowKey = () => `ing-micro-${microRowSeq++}`;

export function IngredientEntryCard({
  value,
  estimatedCalories,
  saved,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
  normalizeNameOnBlur,
}: IngredientEntryCardProps) {
  type NumericKey = Exclude<keyof IngredientEntryValue, 'name' | 'calories' | 'micronutrients'>;
  const setNum = (key: NumericKey, next: number | null) =>
    onChange({ ...value, [key]: sanitize(next) });

  const roundField = (key: NumericKey) => onChange({ ...value, [key]: sanitize(value[key]) });

  const fiberInvalid = (value.fiber ?? 0) > (value.carbs ?? 0);
  // When the macros yield an estimate, an empty calories field uses it on save;
  // otherwise calories must be entered (block submit).
  const hasEstimate = estimatedCalories > 0;
  const caloriesMissing = value.calories == null && !hasEstimate;
  const caloriesPlaceholder = hasEstimate
    ? `Estimated calories: ${Math.round(estimatedCalories)}`
    : 'Calories';

  // Micronutrient editor. Stable per-row keys so removing a row doesn't remount
  // the wrong inputs (array index keys are unsafe for an editable list).
  const micronutrients = value.micronutrients ?? [];
  const [microKeys, setMicroKeys] = useState<string[]>(() => micronutrients.map(nextMicroRowKey));
  const updateMicro = (idx: number, patch: Partial<IngredientMicronutrientValue>) =>
    onChange({
      ...value,
      micronutrients: micronutrients.map((m, i) => (i === idx ? { ...m, ...patch } : m)),
    });
  const addMicro = () => {
    setMicroKeys((keys) => [...keys, nextMicroRowKey()]);
    onChange({ ...value, micronutrients: [...micronutrients, { name: '', unit: 'milligram' }] });
  };
  const removeMicro = (idx: number) => {
    setMicroKeys((keys) => keys.filter((_, i) => i !== idx));
    onChange({ ...value, micronutrients: micronutrients.filter((_, i) => i !== idx) });
  };

  return (
    <AnalyticsScope properties={{ organism: 'IngredientEntryCard' }}>
      <SectionCard saved={saved}>
        <div className={cn(recipes.stack.row, recipes.stack.between)}>
          <SectionHeading noMargin>Ingredient Entry</SectionHeading>
          <div className={recipes.stack.row}>
            {onCancel ? (
              <Button size="sm" variant="secondary" onClick={onCancel}>
                Cancel
              </Button>
            ) : null}
            <Button size="sm" onClick={onSubmit} disabled={fiberInvalid || caloriesMissing}>
              {submitLabel}
            </Button>
          </div>
        </div>

        <Field label="Ingredient Name">
          <Input
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            normalizeOnBlur={normalizeNameOnBlur}
            onNormalized={(name) => onChange({ ...value, name })}
          />
        </Field>

        <NumberInput
          label="Calories (kcal)"
          value={value.calories}
          placeholder={caloriesPlaceholder}
          onChange={(n) => onChange({ ...value, calories: sanitizeCalories(n) })}
          onBlur={() => onChange({ ...value, calories: sanitizeCalories(value.calories) })}
        />

        <NumberInput
          label="Weight (g)"
          value={value.weight}
          onChange={(n) => setNum('weight', n)}
          onBlur={() => roundField('weight')}
        />

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

        <SectionHeading as="h4" noMargin>
          Optional
        </SectionHeading>
        <div className={recipes.grid.two}>
          <NumberInput
            label="Sugar alcohol (g)"
            value={value.sugarAlcohol}
            onChange={(n) => setNum('sugarAlcohol', n)}
            onBlur={() => roundField('sugarAlcohol')}
          />
          <NumberInput
            label="Allulose (g)"
            value={value.allulose}
            onChange={(n) => setNum('allulose', n)}
            onBlur={() => roundField('allulose')}
          />
          <NumberInput
            label="Alcohol (g)"
            value={value.alcohol}
            onChange={(n) => setNum('alcohol', n)}
            onBlur={() => roundField('alcohol')}
          />
        </div>

        <div className={cn(recipes.stack.row, recipes.stack.between)}>
          <SectionHeading as="h4" noMargin>
            Micronutrients
          </SectionHeading>
          <Button variant="subtle" size="sm" onClick={addMicro} type="button">
            Add row
          </Button>
        </div>
        {micronutrients.length > 0 ? (
          <div className={recipes.stack.sm}>
            {micronutrients.map((micro, idx) => (
              <div key={microKeys[idx]} className={cn(recipes.stack.row, 'items-end')}>
                <div className="flex-1">
                  <Field label="Name">
                    <Input
                      value={micro.name}
                      onChange={(e) => updateMicro(idx, { name: e.target.value })}
                      placeholder="e.g. Sodium"
                    />
                  </Field>
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
                    <Select
                      value={micro.unit ?? 'milligram'}
                      onChange={(e) => updateMicro(idx, { unit: e.target.value })}
                    >
                      {NUTRITION_UNIT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className="w-16 shrink-0">
                  <NumberInput
                    label="% DV"
                    value={micro.percentDailyValue ?? null}
                    onChange={(n) => updateMicro(idx, { percentDailyValue: n })}
                  />
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
