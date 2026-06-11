// Pure nutrition-label scaling logic shared by the scan API and tested in isolation.
// Given what a label reports (basis + serving info + per-basis nutrients) and what the
// user asked for (a weight, a number of servings, or the entire package), resolve the
// final ingredient weight, scale the macros, and decide whether the result is applicable.

import { estimateCalories } from './calculations';

export type ScanBasis = 'per_serving' | 'per_100g' | 'unknown';

export type ScanNutrients = {
  calories: number;
  fat: number;
  saturatedFat: number;
  carbs: number;
  fiber: number;
  protein: number;
  /** Optional sugar extracted from the label. */
  sugar?: number;
  /** Optional sugar alcohol extracted from the label. */
  sugarAlcohol?: number;
  /** Optional allulose extracted from the label. */
  allulose?: number;
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

export type DatabaseCandidate = {
  name: string;
  servingAmount: number;
  calories: number;
  fat: number;
  carbs: number;
  protein: number;
  saturatedFat?: number;
  fiber?: number;
  sugar?: number;
  sugarAlcohol?: number;
  allulose?: number;
};

export type ScanResolution = {
  proposed: ScanProposed;
  canApply: boolean;
  blockReason?: string;
  /** A non-blocking caution shown alongside an applyable result. */
  warning?: string;
  notes: string[];
  /**
   * When the label provides enough per-serving facts (name, servingAmount, fat, carbs,
   * protein), this holds the data ready to save to the nutrition database.
   * null means the data was present but incomplete; see databaseBlockReason.
   */
  databaseCandidate?: DatabaseCandidate | null;
  /**
   * Human-readable reason why databaseCandidate is null (e.g. "Protein is required").
   * Only set when databaseCandidate is null.
   */
  databaseBlockReason?: string;
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const safe = (n: number) => round1(Math.max(0, n));

function buildDatabaseCandidate(
  label: ScanLabel,
  resolvedName: string,
): { candidate: DatabaseCandidate | null; blockReason?: string } {
  // unknown basis cannot produce a reliable per-serving candidate
  if (label.basis === 'unknown') {
    return { candidate: null, blockReason: undefined };
  }

  // name is required
  const name = resolvedName.trim();
  if (!name) {
    return { candidate: null, blockReason: 'Name is required' };
  }

  // Determine serving amount
  let servingAmount: number;
  if (label.basis === 'per_serving') {
    const serving =
      label.servingSizeGrams && label.servingSizeGrams > 0 ? label.servingSizeGrams : null;
    if (!serving) {
      return { candidate: null, blockReason: 'Serving size is required' };
    }
    servingAmount = serving;
  } else {
    // per_100g: prefer actual serving size when available, fall back to 100
    const serving =
      label.servingSizeGrams && label.servingSizeGrams > 0 ? label.servingSizeGrams : null;
    servingAmount = serving ?? 100;
  }

  // Required macros
  if (label.nutrients.fat == null || label.nutrients.fat < 0) {
    return { candidate: null, blockReason: 'Fat is required' };
  }
  if (label.nutrients.carbs == null || label.nutrients.carbs < 0) {
    return { candidate: null, blockReason: 'Carbs is required' };
  }
  if (label.nutrients.protein == null || label.nutrients.protein < 0) {
    return { candidate: null, blockReason: 'Protein is required' };
  }

  // For per_100g labels we scale to actual serving size if different from 100
  let fat = label.nutrients.fat;
  let carbs = label.nutrients.carbs;
  let protein = label.nutrients.protein;
  let saturatedFat = label.nutrients.saturatedFat;
  let fiber = label.nutrients.fiber;
  let sugar = label.nutrients.sugar;
  let sugarAlcohol = label.nutrients.sugarAlcohol;
  let allulose = label.nutrients.allulose;
  let printedCalories = label.nutrients.calories;

  if (label.basis === 'per_100g' && servingAmount !== 100) {
    const factor = servingAmount / 100;
    fat = round1(fat * factor);
    carbs = round1(carbs * factor);
    protein = round1(protein * factor);
    printedCalories = round1(printedCalories * factor);
    if (saturatedFat != null) saturatedFat = round1(saturatedFat * factor);
    if (fiber != null) fiber = round1(fiber * factor);
    if (sugar != null) sugar = round1(sugar * factor);
    if (sugarAlcohol != null) sugarAlcohol = round1(sugarAlcohol * factor);
    if (allulose != null) allulose = round1(allulose * factor);
  }

  const calories =
    printedCalories > 0
      ? printedCalories
      : estimateCalories({ fat, carbs, protein, fiber, sugarAlcohol, allulose });

  const candidate: DatabaseCandidate = {
    name,
    servingAmount,
    calories,
    fat,
    carbs,
    protein,
  };

  if (saturatedFat != null) candidate.saturatedFat = saturatedFat;
  if (fiber != null) candidate.fiber = fiber;
  if (sugar != null) candidate.sugar = sugar;
  if (sugarAlcohol != null) candidate.sugarAlcohol = sugarAlcohol;
  if (allulose != null) candidate.allulose = allulose;

  return { candidate };
}

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
  let warning: string | undefined;

  if (request.entirePackage) {
    if (!perContainer) {
      // Can't compute the package total without a servings-per-container count.
      // Fall back to a single serving and warn instead of blocking.
      factor = label.basis === 'per_100g' && serving ? serving / 100 : 1;
      targetWeight = serving ?? 0;
      warning =
        'Servings per container unreadable. Applied a single serving — adjust the weight if needed.';
      canApply = true;
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

  // Derive the name that will be used for the database candidate:
  // prefer the user-supplied name, then the inferred name.
  const resolvedName = request.name.trim() || label.inferredName || '';
  const { candidate, blockReason: dbBlockReason } = buildDatabaseCandidate(label, resolvedName);

  const resolution: ScanResolution = {
    proposed: {
      name: !request.name.trim() && label.inferredName ? label.inferredName : undefined,
      weight: safe(targetWeight),
      calories: safe(label.nutrients.calories * factor),
      fat: safe(label.nutrients.fat * factor),
      saturatedFat: safe(label.nutrients.saturatedFat * factor),
      carbs: safe(label.nutrients.carbs * factor),
      fiber: safe(label.nutrients.fiber * factor),
      protein: safe(label.nutrients.protein * factor),
      sugar: label.nutrients.sugar != null ? safe(label.nutrients.sugar * factor) : undefined,
      sugarAlcohol:
        label.nutrients.sugarAlcohol != null
          ? safe(label.nutrients.sugarAlcohol * factor)
          : undefined,
      allulose:
        label.nutrients.allulose != null ? safe(label.nutrients.allulose * factor) : undefined,
    },
    canApply,
    blockReason: canApply ? undefined : blockReason,
    warning,
    notes,
  };

  if (label.basis === 'unknown') {
    // No candidate for unknown basis; omit databaseCandidate entirely
  } else if (candidate !== null) {
    resolution.databaseCandidate = candidate;
  } else {
    resolution.databaseCandidate = null;
    resolution.databaseBlockReason = dbBlockReason;
  }

  return resolution;
}
