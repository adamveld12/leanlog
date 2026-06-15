import { NutritionDatabaseEntryCard, type NutritionDatabaseEntryValue } from '@leanlog/ui';
import {
  estimateCalories,
  type CreateNutritionDatabaseIngredient,
  type NutritionUnit,
} from '@leanlog/data-access';

export type DatabaseLabelFormProps = {
  value: NutritionDatabaseEntryValue;
  submitting: boolean;
  /** Whether the form was populated by a scan or typed manually. */
  source: 'manual' | 'scan';
  onChange: (value: NutritionDatabaseEntryValue) => void;
  onPublish: (payload: CreateNutritionDatabaseIngredient) => void;
};

// The Nutrition Facts label create form: wraps the card, computes the calorie
// estimate, and builds the strict create payload (resolving an empty calories to
// the estimate and dropping unnamed micronutrient rows) for the caller to save.
export function DatabaseLabelForm({
  value,
  submitting,
  source,
  onChange,
  onPublish,
}: DatabaseLabelFormProps) {
  const estimatedCalories = estimateCalories({
    fat: value.fat ?? 0,
    carbs: value.carbs ?? 0,
    protein: value.protein ?? 0,
    fiber: value.fiber ?? null,
    sugarAlcohol: value.sugarAlcohol ?? null,
    allulose: value.allulose ?? null,
    alcohol: value.alcohol ?? null,
  });

  return (
    <NutritionDatabaseEntryCard
      value={value}
      estimatedCalories={estimatedCalories}
      submitting={submitting}
      onChange={onChange}
      onSubmit={() => {
        // The card disables Publish until these are filled; this guard narrows the
        // nullable draft for the strict schema (calories may be estimated).
        if (
          value.servingAmount == null ||
          value.servingsPerPackage == null ||
          value.fat == null ||
          value.carbs == null ||
          value.protein == null
        )
          return;
        onPublish({
          ...value,
          servingAmount: value.servingAmount,
          servingSizeUnit: value.servingSizeUnit === 'milliliter' ? 'milliliter' : 'gram',
          servingSizeDisplayText: value.servingSizeDisplayText ?? undefined,
          servingsPerPackage: value.servingsPerPackage,
          fat: value.fat,
          carbs: value.carbs,
          protein: value.protein,
          calories: value.calories ?? estimatedCalories,
          micronutrients: value.micronutrients?.reduce<
            { name: string; amount: number; unit: NutritionUnit }[]
          >((acc, m) => {
            if (m.name.trim().length > 0) {
              acc.push({
                name: m.name,
                amount: m.amount ?? 0,
                unit: (m.unit ?? 'milligram') as NutritionUnit,
              });
            }
            return acc;
          }, []),
          creationSource: source,
        });
      }}
    />
  );
}
