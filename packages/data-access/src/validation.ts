// Pure validation for saved nutrition labels (#44, R5/R6). Sub-values must not
// exceed the totals they belong to. We deliberately check each sub-component
// against its parent total individually rather than summing fat sub-components,
// because unsaturated fat overlaps mono/polyunsaturated and a sum would produce
// false contradictions. Unsaturated fat is never derived from other fields (R6).

export type NutritionLabelFacts = {
  fat: number;
  carbs: number;
  protein: number;
  saturatedFat?: number | null;
  transFat?: number | null;
  unsaturatedFat?: number | null;
  monounsaturatedFat?: number | null;
  polyunsaturatedFat?: number | null;
  fiber?: number | null;
  sugar?: number | null;
  addedSugars?: number | null;
  sugarAlcohol?: number | null;
  allulose?: number | null;
};

export type NutritionLabelValidationError = { field: string; message: string };

const cap = (
  errors: NutritionLabelValidationError[],
  field: string,
  value: number | null | undefined,
  limit: number,
  label: string,
  limitLabel: string,
) => {
  if (value != null && value > limit) {
    errors.push({
      field,
      message: `${label} (${value}) cannot exceed ${limitLabel} (${limit})`,
    });
  }
};

// Returns an empty array when the label is internally consistent. A non-empty
// result must block saving (the form disables save; the API returns 400).
export function validateNutritionLabel(
  facts: NutritionLabelFacts,
): NutritionLabelValidationError[] {
  const errors: NutritionLabelValidationError[] = [];

  cap(errors, 'saturatedFat', facts.saturatedFat, facts.fat, 'Saturated fat', 'total fat');
  cap(errors, 'transFat', facts.transFat, facts.fat, 'Trans fat', 'total fat');
  cap(errors, 'unsaturatedFat', facts.unsaturatedFat, facts.fat, 'Unsaturated fat', 'total fat');
  cap(
    errors,
    'monounsaturatedFat',
    facts.monounsaturatedFat,
    facts.fat,
    'Monounsaturated fat',
    'total fat',
  );
  cap(
    errors,
    'polyunsaturatedFat',
    facts.polyunsaturatedFat,
    facts.fat,
    'Polyunsaturated fat',
    'total fat',
  );

  cap(errors, 'fiber', facts.fiber, facts.carbs, 'Fiber', 'total carbs');
  cap(errors, 'sugar', facts.sugar, facts.carbs, 'Total sugars', 'total carbs');
  cap(errors, 'sugarAlcohol', facts.sugarAlcohol, facts.carbs, 'Sugar alcohol', 'total carbs');
  cap(errors, 'allulose', facts.allulose, facts.carbs, 'Allulose', 'total carbs');

  // Added sugars are a subset of total sugars; fall back to total carbs when no
  // total-sugars value is present.
  const sugarLimit = facts.sugar != null ? facts.sugar : facts.carbs;
  const sugarLimitLabel = facts.sugar != null ? 'total sugars' : 'total carbs';
  cap(errors, 'addedSugars', facts.addedSugars, sugarLimit, 'Added sugars', sugarLimitLabel);

  return errors;
}
