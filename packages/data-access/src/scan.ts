// Pure nutrition-label scaling logic shared by the scan API and tested in isolation.
// Given what a label reports (basis + serving info + per-basis nutrients) and what the
// user asked for (a weight, a number of servings, or the entire package), resolve the
// final ingredient weight, scale the macros, and decide whether the result is applicable.

import { estimateCalories } from './calculations';
import type { Micronutrient, ServingSizeUnit } from './models';

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
  /** Optional added sugars extracted from the label. */
  addedSugars?: number;
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
  /** Typed micronutrients (e.g. sodium, cholesterol) extracted from the label. */
  micronutrients?: Micronutrient[];
  /** The printed serving description, e.g. "1 tbsp. (7g)"; null when unreadable. */
  servingSizeText?: string | null;
  /** Whether the metric serving size is a weight (gram) or volume (milliliter). */
  servingSizeUnit?: ServingSizeUnit | null;
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
  /**
   * Database-tab scans are stricter than meal scans (R15): the resulting label
   * candidate must have explicit calories and a readable servings-per-package,
   * or it is not save-ready.
   */
  strict?: boolean;
};

export type ScanProposed = ScanNutrients & { name?: string; weight: number };

// A staged nutrition label ready to save to the Nutrition Facts Database. Maps
// onto CreateNutritionDatabaseIngredient — serving size + unit + servings per
// package are part of the label (R8/R9).
export type DatabaseCandidate = {
  name: string;
  servingAmount: number;
  servingSizeUnit: ServingSizeUnit;
  servingSizeDisplayText?: string;
  servingsPerPackage: number;
  calories: number;
  fat: number;
  carbs: number;
  protein: number;
  saturatedFat?: number;
  fiber?: number;
  sugar?: number;
  addedSugars?: number;
  sugarAlcohol?: number;
  allulose?: number;
  micronutrients?: Micronutrient[];
};

// Best-effort label values for prefilling the database form, even when the scan
// is not save-ready (e.g. the name couldn't be read). Required fields are
// nullable so the form can highlight what's still missing for the user to fill.
export type ScanLabelDraft = {
  name: string | null;
  servingAmount: number | null;
  servingSizeUnit: ServingSizeUnit;
  servingSizeDisplayText?: string;
  servingsPerPackage: number | null;
  calories: number | null;
  fat: number | null;
  carbs: number | null;
  protein: number | null;
  saturatedFat?: number;
  fiber?: number;
  sugar?: number;
  addedSugars?: number;
  sugarAlcohol?: number;
  allulose?: number;
  micronutrients?: Micronutrient[];
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
  /**
   * Best-effort label values for prefilling the database form, present whenever
   * the label basis is readable — even when not save-ready. null only for an
   * unreadable (unknown-basis) label.
   */
  labelDraft?: ScanLabelDraft | null;
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const safe = (n: number) => round1(Math.max(0, n));

// Parse a metric serving size + unit from a printed serving description, e.g.
// "1 cup (240mL)" → { amount: 240, unit: 'milliliter' }; "3/4 cup (170g)" →
// { amount: 170, unit: 'gram' }. A fallback for when the model doesn't return a
// numeric servingSizeGrams (common for volume servings).
function parseServingFromText(
  text: string | null | undefined,
): { amount: number; unit: ServingSizeUnit } | null {
  if (!text) return null;
  const m = text.match(/(\d+(?:\.\d+)?)\s*(milliliters?|millilitres?|ml|grams?|g)\b/i);
  if (!m) return null;
  const amount = Number(m[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { amount, unit: m[2][0].toLowerCase() === 'm' ? 'milliliter' : 'gram' };
}

function buildLabel(
  label: ScanLabel,
  resolvedName: string,
  strict: boolean,
): { draft: ScanLabelDraft | null; candidate: DatabaseCandidate | null; blockReason?: string } {
  // unknown basis cannot produce a reliable per-serving label
  if (label.basis === 'unknown') {
    return { draft: null, candidate: null };
  }

  const name = resolvedName.trim();
  const parsedServing = parseServingFromText(label.servingSizeText);
  const serving =
    label.servingSizeGrams && label.servingSizeGrams > 0
      ? label.servingSizeGrams
      : (parsedServing?.amount ?? null);
  // Serving size unit: explicit from the scan, else inferred from the printed
  // serving text, else grams.
  const servingSizeUnit: ServingSizeUnit = label.servingSizeUnit ?? parsedServing?.unit ?? 'gram';
  // Best-effort serving amount: per_serving uses the printed serving (may be
  // null); per_100g prefers the printed serving, falling back to 100.
  const servingAmount = label.basis === 'per_serving' ? serving : (serving ?? 100);
  // A saved label requires servings per package (R8); for package scaling (R17).
  const servingsPerPackage =
    label.servingsPerContainer && label.servingsPerContainer > 0
      ? label.servingsPerContainer
      : null;

  // For per_100g labels we scale to actual serving size when known and != 100.
  let fat = label.nutrients.fat;
  let carbs = label.nutrients.carbs;
  let protein = label.nutrients.protein;
  let saturatedFat = label.nutrients.saturatedFat;
  let fiber = label.nutrients.fiber;
  let sugar = label.nutrients.sugar;
  let addedSugars = label.nutrients.addedSugars;
  let sugarAlcohol = label.nutrients.sugarAlcohol;
  let allulose = label.nutrients.allulose;
  let printedCalories = label.nutrients.calories;

  if (label.basis === 'per_100g' && servingAmount != null && servingAmount !== 100) {
    const factor = servingAmount / 100;
    fat = round1(fat * factor);
    carbs = round1(carbs * factor);
    protein = round1(protein * factor);
    printedCalories = round1(printedCalories * factor);
    if (saturatedFat != null) saturatedFat = round1(saturatedFat * factor);
    if (fiber != null) fiber = round1(fiber * factor);
    if (sugar != null) sugar = round1(sugar * factor);
    if (addedSugars != null) addedSugars = round1(addedSugars * factor);
    if (sugarAlcohol != null) sugarAlcohol = round1(sugarAlcohol * factor);
    if (allulose != null) allulose = round1(allulose * factor);
  }

  const calories =
    printedCalories > 0
      ? printedCalories
      : estimateCalories({ fat, carbs, protein, fiber, sugarAlcohol, allulose });
  const displayText =
    label.servingSizeText && label.servingSizeText.trim()
      ? label.servingSizeText.trim()
      : undefined;
  const micronutrients =
    label.micronutrients && label.micronutrients.length > 0 ? label.micronutrients : undefined;

  // Best-effort draft for prefilling the form (always, when basis is readable).
  const draft: ScanLabelDraft = {
    name: name || null,
    servingAmount: servingAmount ?? null,
    servingSizeUnit,
    servingsPerPackage,
    calories,
    fat,
    carbs,
    protein,
  };
  if (displayText) draft.servingSizeDisplayText = displayText;
  if (saturatedFat != null) draft.saturatedFat = saturatedFat;
  if (fiber != null) draft.fiber = fiber;
  if (sugar != null) draft.sugar = sugar;
  if (addedSugars != null) draft.addedSugars = addedSugars;
  if (sugarAlcohol != null) draft.sugarAlcohol = sugarAlcohol;
  if (allulose != null) draft.allulose = allulose;
  if (micronutrients) draft.micronutrients = micronutrients;

  // Save-readiness for the strict database candidate (precedence preserved).
  let blockReason: string | undefined;
  if (!name) blockReason = 'Name is required';
  else if (label.basis === 'per_serving' && !serving) blockReason = 'Serving size is required';
  else if (!servingsPerPackage) blockReason = 'Servings per package is required';
  else if (label.nutrients.fat == null || label.nutrients.fat < 0) blockReason = 'Fat is required';
  else if (label.nutrients.carbs == null || label.nutrients.carbs < 0)
    blockReason = 'Carbs is required';
  else if (label.nutrients.protein == null || label.nutrients.protein < 0)
    blockReason = 'Protein is required';
  // The stricter database scanner must not invent calories (R15).
  else if (strict && !(printedCalories > 0)) blockReason = 'Calories are required';

  if (blockReason || servingAmount == null || servingsPerPackage == null) {
    return { draft, candidate: null, blockReason };
  }

  const candidate: DatabaseCandidate = {
    name,
    servingAmount,
    servingSizeUnit,
    servingsPerPackage,
    calories,
    fat,
    carbs,
    protein,
  };
  if (displayText) candidate.servingSizeDisplayText = displayText;
  if (saturatedFat != null) candidate.saturatedFat = saturatedFat;
  if (fiber != null) candidate.fiber = fiber;
  if (sugar != null) candidate.sugar = sugar;
  if (addedSugars != null) candidate.addedSugars = addedSugars;
  if (sugarAlcohol != null) candidate.sugarAlcohol = sugarAlcohol;
  if (allulose != null) candidate.allulose = allulose;
  if (micronutrients) candidate.micronutrients = micronutrients;

  return { draft, candidate };
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
  const {
    draft,
    candidate,
    blockReason: dbBlockReason,
  } = buildLabel(label, resolvedName, request.strict ?? false);

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

  // Best-effort prefill values (null only for an unreadable label).
  resolution.labelDraft = draft;

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
