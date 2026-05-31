// Pure nutrition-label scaling logic shared by the scan API and tested in isolation.
// Given what a label reports (basis + serving info + per-basis nutrients) and what the
// user asked for (a weight, a number of servings, or the entire package), resolve the
// final ingredient weight, scale the macros, and decide whether the result is applicable.

export type ScanBasis = 'per_serving' | 'per_100g' | 'unknown';

export type ScanNutrients = {
  calories: number;
  fat: number;
  saturatedFat: number;
  carbs: number;
  fiber: number;
  protein: number;
};

export type ScanLabel = {
  basis: ScanBasis;
  /** Serving size in grams/ml, or null when unreadable. */
  servingSizeGrams: number | null;
  /** Servings per container/package, or null when unreadable. */
  servingsPerContainer: number | null;
  nutrients: ScanNutrients;
  inferredName: string | null;
};

export type ScanMode = 'weight' | 'servings';

export type ScanRequest = {
  /** Whether the numeric input is a weight or a serving count. */
  mode: ScanMode;
  /** User-entered weight (grams/ml). Used when mode === 'weight'. */
  weight: number;
  /** User-entered serving count. Used when mode === 'servings'. */
  servings: number;
  /** When true, ignore the numeric input and use serving size x servings-per-container. */
  entirePackage: boolean;
  /** Existing ingredient name from the form; controls whether an inferred name is offered. */
  name: string;
};

export type ScanProposed = ScanNutrients & { name?: string; weight: number };

export type ScanResolution = {
  proposed: ScanProposed;
  canApply: boolean;
  blockReason?: string;
  notes: string[];
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const safe = (n: number) => round1(Math.max(0, n));

export function resolveScan(label: ScanLabel, request: ScanRequest): ScanResolution {
  const notes: string[] = [];
  const serving =
    label.servingSizeGrams && label.servingSizeGrams > 0 ? label.servingSizeGrams : null;
  const perContainer =
    label.servingsPerContainer && label.servingsPerContainer > 0
      ? label.servingsPerContainer
      : null;

  const weight = Number.isFinite(request.weight) && request.weight > 0 ? request.weight : 0;
  const servingsInput =
    Number.isFinite(request.servings) && request.servings > 0 ? request.servings : 0;

  let targetWeight = 0;
  let factor = 1;
  let canApply = false;
  let blockReason: string | undefined;

  if (request.entirePackage) {
    if (!perContainer) {
      blockReason = 'Servings per container unreadable. Retake photo or uncheck entire package.';
    } else if (label.basis === 'per_serving') {
      if (!serving) {
        blockReason =
          'Serving size unreadable. Cannot compute package weight. Enter weight instead.';
      } else {
        factor = perContainer;
        targetWeight = serving * perContainer;
        canApply = true;
      }
    } else if (label.basis === 'per_100g') {
      if (!serving) {
        blockReason = 'Serving size unreadable for per-100g label. Enter weight instead.';
      } else {
        targetWeight = serving * perContainer;
        factor = targetWeight / 100;
        canApply = true;
      }
    } else {
      blockReason = 'Label basis unclear. Enter weight manually.';
    }
  } else if (request.mode === 'servings') {
    const count = servingsInput > 0 ? servingsInput : 1; // assume 1 serving when blank
    if (servingsInput === 0) notes.push('No servings entered. Assuming 1 serving.');
    if (label.basis === 'per_serving') {
      factor = count;
      targetWeight = serving ? serving * count : 0;
      if (!serving) {
        notes.push('Serving size unreadable. Weight left blank; macros scaled by servings.');
      }
      canApply = true;
    } else if (label.basis === 'per_100g') {
      if (!serving) {
        blockReason = 'Serving size unreadable for per-100g label. Enter weight instead.';
      } else {
        targetWeight = serving * count;
        factor = targetWeight / 100;
        canApply = true;
      }
    } else {
      blockReason = 'Label basis unclear. Enter weight manually.';
    }
  } else if (weight > 0) {
    targetWeight = weight;
    if (label.basis === 'per_serving') {
      if (serving) factor = weight / serving;
      else notes.push('Serving size unreadable. Using one-serving values without scaling.');
      canApply = true;
    } else if (label.basis === 'per_100g') {
      factor = weight / 100;
      canApply = true;
    } else {
      notes.push('Label basis unclear. Applied values without scaling.');
      canApply = true;
    }
  } else if (label.basis === 'per_serving' && serving) {
    // No weight entered: fall back to a single serving.
    targetWeight = serving;
    canApply = true;
    notes.push('No weight entered. Assuming one serving.');
  } else {
    blockReason = 'Enter a weight or serving count, or retake the photo.';
  }

  return {
    proposed: {
      name: !request.name.trim() && label.inferredName ? label.inferredName : undefined,
      weight: safe(targetWeight),
      calories: safe(label.nutrients.calories * factor),
      fat: safe(label.nutrients.fat * factor),
      saturatedFat: safe(label.nutrients.saturatedFat * factor),
      carbs: safe(label.nutrients.carbs * factor),
      fiber: safe(label.nutrients.fiber * factor),
      protein: safe(label.nutrients.protein * factor),
    },
    canApply,
    blockReason: canApply ? undefined : blockReason,
    notes,
  };
}
