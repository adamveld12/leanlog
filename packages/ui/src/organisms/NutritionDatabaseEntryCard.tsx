import { useState } from 'react';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Button } from '../atoms/Button';
import { Field } from '../atoms/Field';
import { HelperText } from '../atoms/HelperText';
import { Input } from '../atoms/Input';
import { NumberInput } from '../atoms/NumberInput';
import { Select } from '../atoms/Select';
import { SectionHeading } from '../atoms/SectionHeading';
import { WarningText } from '../atoms/WarningText';
import { SectionCard } from '../molecules/SectionCard';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

// Typed nutrient units (R3); kept in sync with @leanlog/data-access
// NutritionUnitSchema. The presentational ui package stays dependency-free, so
// the server remains the authoritative validator via validateNutritionLabel.
const NUTRITION_UNIT_OPTIONS = [
  { value: 'gram', label: 'g' },
  { value: 'milligram', label: 'mg' },
  { value: 'microgram', label: 'mcg' },
  { value: 'milliliter', label: 'ml' },
  { value: 'international_unit', label: 'IU' },
] as const;

const SERVING_SIZE_UNIT_OPTIONS = [
  { value: 'gram', label: 'g' },
  { value: 'milliliter', label: 'ml' },
] as const;

export type NutritionDatabaseMicronutrientValue = {
  name: string;
  amount?: number | null;
  unit?: string;
};

export type NutritionDatabaseEntryValue = {
  name: string;
  servingAmount: number | null;
  servingSizeUnit?: string;
  servingSizeDisplayText?: string | null;
  servingsPerPackage: number | null;
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
  addedSugars?: number | null;
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

let microRowSeq = 0;
const nextMicroRowKey = () => `micro-row-${microRowSeq++}`;

const clamp999 = (n: number) => Math.max(0, Math.min(999, n));
const clamp9999 = (n: number) => Math.max(0, Math.min(9999, n));
const round1 = (n: number) => Math.round(n * 10) / 10;
const sanitize = (n: number | null) => (n == null ? null : round1(clamp999(n)));
const sanitizeCalories = (n: number | null) => (n == null ? null : round1(clamp9999(n)));

function missingFields(value: NutritionDatabaseEntryValue): string[] {
  const missing: string[] = [];
  if (!value.name.trim()) missing.push('Name');
  if (value.servingAmount == null || !(value.servingAmount > 0))
    missing.push('Serving size (must be > 0)');
  if (value.servingsPerPackage == null || !(value.servingsPerPackage > 0))
    missing.push('Servings per package (must be > 0)');
  if (value.calories == null) missing.push('Calories');
  if (value.fat == null) missing.push('Fat');
  if (value.carbs == null) missing.push('Carbs');
  if (value.protein == null) missing.push('Protein');
  return missing;
}

// Mirrors @leanlog/data-access validateNutritionLabel (R5/R6): each sub-value
// must not exceed the total it belongs to. Unsaturated fat is never derived.
function labelContradictions(value: NutritionDatabaseEntryValue): string[] {
  const errors: string[] = [];
  const fat = value.fat ?? 0;
  const carbs = value.carbs ?? 0;
  const over = (v: number | null | undefined, limit: number) => v != null && v > limit;
  if (over(value.saturatedFat, fat)) errors.push('Saturated fat cannot exceed total fat.');
  if (over(value.transFat, fat)) errors.push('Trans fat cannot exceed total fat.');
  if (over(value.unsaturatedFat, fat)) errors.push('Unsaturated fat cannot exceed total fat.');
  if (over(value.monounsaturatedFat, fat))
    errors.push('Monounsaturated fat cannot exceed total fat.');
  if (over(value.polyunsaturatedFat, fat))
    errors.push('Polyunsaturated fat cannot exceed total fat.');
  if (over(value.fiber, carbs)) errors.push('Fiber cannot exceed carbs.');
  if (over(value.sugar, carbs)) errors.push('Total sugars cannot exceed carbs.');
  if (over(value.sugarAlcohol, carbs)) errors.push('Sugar alcohol cannot exceed carbs.');
  if (over(value.allulose, carbs)) errors.push('Allulose cannot exceed carbs.');
  const sugarLimit = value.sugar != null ? value.sugar : carbs;
  if (over(value.addedSugars, sugarLimit)) errors.push('Added sugars cannot exceed total sugars.');
  return errors;
}

function isValid(value: NutritionDatabaseEntryValue): boolean {
  return missingFields(value).length === 0 && labelContradictions(value).length === 0;
}

export function NutritionDatabaseEntryCard({
  value,
  estimatedCalories,
  onChange,
  onSubmit,
  submitting,
}: NutritionDatabaseEntryCardProps) {
  type NumericKey = Exclude<
    keyof NutritionDatabaseEntryValue,
    'name' | 'calories' | 'micronutrients' | 'servingSizeUnit' | 'servingSizeDisplayText'
  >;

  const setNum = (key: NumericKey, n: number | null) => onChange({ ...value, [key]: sanitize(n) });

  const roundField = (key: NumericKey) => {
    const v = value[key];
    if (typeof v === 'number') onChange({ ...value, [key]: sanitize(v) });
  };

  const missing = missingFields(value);
  const contradictions = labelContradictions(value);
  const valid = isValid(value);

  const calorieDisplay =
    value.calories != null && Math.round(value.calories) !== Math.round(estimatedCalories)
      ? `Calories: ${Math.round(value.calories)} kcal · Estimated: ${Math.round(estimatedCalories)} kcal`
      : `Estimated calories: ${Math.round(estimatedCalories)} kcal`;

  // Micronutrient helpers
  const micronutrients = value.micronutrients ?? [];

  // Stable per-row keys. Array index is unsafe for an editable list: removing a row shifts
  // indices and remounts the wrong inputs. We mint a client id per row (seeded from the
  // initial rows) and key on it. Rows only change through the handlers below, which keep
  // the id list in lockstep with `value.micronutrients`.
  const [rowKeys, setRowKeys] = useState<string[]>(() => micronutrients.map(nextMicroRowKey));

  const updateMicro = (idx: number, patch: Partial<NutritionDatabaseMicronutrientValue>) => {
    const next = micronutrients.map((m, i) => (i === idx ? { ...m, ...patch } : m));
    onChange({ ...value, micronutrients: next });
  };

  const addMicro = () => {
    setRowKeys((keys) => [...keys, nextMicroRowKey()]);
    onChange({ ...value, micronutrients: [...micronutrients, { name: '', unit: 'milligram' }] });
  };

  const removeMicro = (idx: number) => {
    setRowKeys((keys) => keys.filter((_, i) => i !== idx));
    onChange({ ...value, micronutrients: micronutrients.filter((_, i) => i !== idx) });
  };

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
        {contradictions.length > 0 ? (
          <WarningText role="alert">{contradictions.join(' ')}</WarningText>
        ) : null}

        <Field label="Name">
          <Input
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
          />
        </Field>
        <HelperText as="p">{calorieDisplay}</HelperText>

        <div className={recipes.grid.two}>
          <NumberInput
            label="Serving size"
            value={value.servingAmount}
            onChange={(n) => setNum('servingAmount', n)}
            onBlur={() => roundField('servingAmount')}
          />
          <Field label="Serving unit">
            <Select
              value={value.servingSizeUnit ?? 'gram'}
              onChange={(e) => onChange({ ...value, servingSizeUnit: e.target.value })}
            >
              {SERVING_SIZE_UNIT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Serving display text (optional)">
          <Input
            value={value.servingSizeDisplayText ?? ''}
            onChange={(e) => onChange({ ...value, servingSizeDisplayText: e.target.value || null })}
            placeholder="e.g. 3/4 cup (170g)"
          />
        </Field>

        <NumberInput
          label="Servings per package"
          value={value.servingsPerPackage}
          onChange={(n) => setNum('servingsPerPackage', n)}
          onBlur={() => roundField('servingsPerPackage')}
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
            inputClassName={
              (value.fiber ?? 0) > (value.carbs ?? 0) ? 'border-[var(--ll-danger)]' : ''
            }
          />
        </div>

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
            label="Total sugars (g)"
            value={value.sugar ?? null}
            onChange={(n) => onChange({ ...value, sugar: sanitize(n) })}
          />
          <NumberInput
            label="Added sugars (g)"
            value={value.addedSugars ?? null}
            onChange={(n) => onChange({ ...value, addedSugars: sanitize(n) })}
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
              <div key={rowKeys[idx]} className={cn(recipes.stack.row, 'items-end')}>
                <div className="flex-1">
                  <Field label="Name">
                    <Input
                      value={micro.name}
                      onChange={(e) => updateMicro(idx, { name: e.target.value })}
                      placeholder="e.g. Vitamin C"
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
                <div className="w-24 shrink-0">
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
