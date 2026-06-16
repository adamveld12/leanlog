// The single source of truth for the nutrition-label extraction prompt.
// Imported by both the scan endpoint and the eval harness so the two can never drift.
export const SCAN_PROMPT = [
  'Read this nutrition label from an image.',
  'Return nutrition values in grams/calories and infer the basis.',
  'basis=per_serving if values represent one serving; per_100g if values are per 100g; unknown otherwise.',
  'Extract servingSizeGrams as the numeric metric serving size whether it is in grams or milliliters (e.g. "240mL" -> 240, "170g" -> 170), otherwise null.',
  'Extract servingSizeUnit as "milliliter" when the metric serving is a volume (mL/ml/liquid) or "gram" when it is a weight; null if unknown.',
  'Extract servingSizeText as the printed serving description exactly as shown (e.g. "1 cup (240mL)"), otherwise null.',
  'Extract servingsPerContainer (servings per package/container) if explicitly shown, otherwise null.',
  'Extract sugar (total sugars), addedSugars, sugarAlcohol, and allulose from the label if shown; omit a field if not present.',
  'Extract every micronutrient listed (sodium, cholesterol, potassium, iron, calcium, vitamins, etc.) into the micronutrients array. For each, include the measured amount and a typed unit (gram, milligram, microgram, milliliter, or international_unit) when a weight is printed, and include percentDailyValue when the label shows a % Daily Value. Include both when both are shown.',
  'If a required field is missing, return 0 and add a note.',
  'Keep numbers realistic and non-negative.',
].join(' ');
