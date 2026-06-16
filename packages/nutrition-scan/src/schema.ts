import { z } from 'zod';

// The structured-output schema the model fills when reading a nutrition label.
// Moved verbatim out of the scan endpoint so the endpoint and the eval grade the
// exact same shape. Post-processing (resolveScan) still lives in @leanlog/data-access.
export const scanSchema = z.object({
  basis: z.enum(['per_serving', 'per_100g', 'unknown']),
  // Numeric metric serving size in grams OR milliliters (volume servings count too).
  servingSizeGrams: z.number().finite().nonnegative().nullable(),
  // Whether the metric serving size is a weight (gram) or volume (milliliter).
  servingSizeUnit: z.enum(['gram', 'milliliter']).nullable(),
  // The printed serving description exactly as shown, e.g. "1 cup (240mL)".
  servingSizeText: z.string().nullable(),
  servingsPerContainer: z.number().finite().nonnegative().nullable(),
  nutrients: z.object({
    calories: z.number().finite().nonnegative(),
    fat: z.number().finite().nonnegative(),
    saturatedFat: z.number().finite().nonnegative(),
    carbs: z.number().finite().nonnegative(),
    fiber: z.number().finite().nonnegative(),
    protein: z.number().finite().nonnegative(),
    sugar: z.number().finite().nonnegative().optional(),
    addedSugars: z.number().finite().nonnegative().optional(),
    sugarAlcohol: z.number().finite().nonnegative().optional(),
    allulose: z.number().finite().nonnegative().optional(),
  }),
  // Sodium, cholesterol, potassium, iron, calcium, vitamins, etc. Each may carry
  // a measured amount+unit, a percent daily value, or both. %DV is used only to
  // back-compute an amount when no measurement is printed; it is never persisted.
  micronutrients: z
    .array(
      z.object({
        name: z.string().min(1),
        amount: z.number().finite().nonnegative().optional(),
        unit: z
          .enum(['gram', 'milligram', 'microgram', 'milliliter', 'international_unit'])
          .optional(),
        percentDailyValue: z.number().finite().nonnegative().optional(),
      }),
    )
    .default([]),
  inferredName: z.string().nullable(),
  notes: z.array(z.string()).default([]),
});

export type ScanResult = z.infer<typeof scanSchema>;
