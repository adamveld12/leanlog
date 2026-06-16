import type { ScanResult } from '@leanlog/nutrition-scan';
import { numericPass, toleranceFor } from './tolerance';

// Ground truth is partial: a fixture only specifies the fields it asserts. Anything
// omitted from `expected` is not scored (it neither passes nor fails).
export type ExpectedMicronutrient = {
  name: string;
  amount?: number;
  unit?: ScanResult['micronutrients'][number]['unit'];
  percentDailyValue?: number;
};

export type ExpectedLabel = {
  basis?: ScanResult['basis'];
  servingSizeGrams?: number | null;
  servingSizeUnit?: ScanResult['servingSizeUnit'];
  servingSizeText?: string | null;
  servingsPerContainer?: number | null;
  nutrients?: Partial<ScanResult['nutrients']>;
  micronutrients?: ExpectedMicronutrient[];
  inferredName?: string | null;
};

export type FieldScore = { field: string; pass: boolean; expected: unknown; actual: unknown };

// A matched micronutrient's sub-field is `unscored` when ground truth didn't assert it —
// so it never counts toward a pass rate. Only `pass`/`fail` are aggregated.
export type SubFieldResult = 'pass' | 'fail' | 'unscored';

export type MatchedMicronutrient = {
  name: string;
  amount: SubFieldResult;
  unit: SubFieldResult;
  dv: SubFieldResult;
};

export type MicronutrientScore = {
  matched: MatchedMicronutrient[];
  missing: string[];
  extra: string[];
};

export type CaseScore = {
  fields: FieldScore[];
  micronutrients: MicronutrientScore;
};

type ScalarKind = 'numeric' | 'enum' | 'fuzzy';

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Names/text match fuzzily: normalized equality, or one normalized string containing
// the other ("Vitamin D" vs "vitamin d", "Vit. B12" vs "Vitamin B12 (cobalamin)").
export function fuzzyPass(expected: string, actual: string): boolean {
  const a = normalize(expected);
  const b = normalize(actual);
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function scalarPass(kind: ScalarKind, field: string, expected: unknown, actual: unknown): boolean {
  // A null ground-truth value asserts "unreadable / not present".
  if (expected === null) return actual === null || actual === undefined;
  // A ground-truth zero means "nothing to report": the model may either return 0 or omit
  // the (optional) field entirely. A label that prints "0%" %DV or "0mg" is commonly left
  // out of the structured output, and that omission is acceptable — not a miss.
  if (kind === 'numeric' && expected === 0 && (actual === null || actual === undefined))
    return true;
  if (actual === null || actual === undefined) return false;
  switch (kind) {
    case 'numeric':
      return numericPass(expected as number, actual as number, toleranceFor(field));
    case 'enum':
      return expected === actual;
    case 'fuzzy':
      return fuzzyPass(String(expected), String(actual));
  }
}

const SCALAR_FIELDS: { key: keyof ExpectedLabel; kind: ScalarKind }[] = [
  { key: 'basis', kind: 'enum' },
  { key: 'servingSizeGrams', kind: 'numeric' },
  { key: 'servingSizeUnit', kind: 'enum' },
  { key: 'servingSizeText', kind: 'fuzzy' },
  { key: 'servingsPerContainer', kind: 'numeric' },
  { key: 'inferredName', kind: 'fuzzy' },
];

const NUTRIENT_FIELDS: (keyof ScanResult['nutrients'])[] = [
  'calories',
  'fat',
  'saturatedFat',
  'carbs',
  'fiber',
  'protein',
  'sugar',
  'addedSugars',
  'sugarAlcohol',
  'allulose',
];

export function scoreMicronutrients(
  expected: ExpectedMicronutrient[] | undefined,
  actual: ScanResult['micronutrients'] | undefined,
): MicronutrientScore {
  const exp = expected ?? [];
  const act = actual ?? [];
  const usedActual = new Set<number>();
  const matched: MicronutrientScore['matched'] = [];
  const missing: string[] = [];

  for (const e of exp) {
    const idx = act.findIndex((a, i) => !usedActual.has(i) && fuzzyPass(e.name, a.name));
    if (idx === -1) {
      missing.push(e.name);
      continue;
    }
    usedActual.add(idx);
    const a = act[idx];
    const result = (asserted: boolean, pass: boolean): SubFieldResult =>
      !asserted ? 'unscored' : pass ? 'pass' : 'fail';
    matched.push({
      name: e.name,
      amount: result(
        e.amount !== undefined,
        scalarPass('numeric', 'micronutrient.amount', e.amount, a.amount),
      ),
      unit: result(e.unit !== undefined, e.unit === a.unit),
      dv: result(
        e.percentDailyValue !== undefined,
        scalarPass(
          'numeric',
          'micronutrient.percentDailyValue',
          e.percentDailyValue,
          a.percentDailyValue,
        ),
      ),
    });
  }

  const extra = act.filter((_, i) => !usedActual.has(i)).map((a) => a.name);
  return { matched, missing, extra };
}

// Score a single model output against partial ground truth. Only fields present in
// `expected` are scored; micronutrients are matched by name with misses/extras surfaced.
export function scoreCase(expected: ExpectedLabel, actual: ScanResult): CaseScore {
  const fields: FieldScore[] = [];

  for (const { key, kind } of SCALAR_FIELDS) {
    if (!(key in expected)) continue;
    const exp = expected[key];
    const act = actual[key as keyof ScanResult];
    fields.push({ field: key, pass: scalarPass(kind, key, exp, act), expected: exp, actual: act });
  }

  if (expected.nutrients) {
    for (const key of NUTRIENT_FIELDS) {
      if (!(key in expected.nutrients)) continue;
      const exp = expected.nutrients[key];
      const act = actual.nutrients[key];
      fields.push({
        field: key,
        pass: scalarPass('numeric', key, exp, act),
        expected: exp,
        actual: act,
      });
    }
  }

  return {
    fields,
    micronutrients: scoreMicronutrients(expected.micronutrients, actual.micronutrients),
  };
}
