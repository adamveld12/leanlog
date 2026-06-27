// USDA whole-foods preseed (#72). Pure, dependency-free transforms that turn a
// curated USDA FoodData Central CSV row into a deterministic catalog row plus the
// `INSERT OR REPLACE` SQL the seed pipeline executes against D1.
//
// This module is intentionally self-contained: it has no runtime relative imports
// (only `import type`) and uses no Node built-ins, so it is safe in the worker
// bundle, runs in the Node test harness, and can be imported directly by the
// `--experimental-strip-types` generator script in @leanlog/data-d1.

import type { Micronutrient, NutritionUnit } from './models';

// Sentinel owner id for every seeded USDA row. The catalog's owner-only edit/
// delete gate then makes these read-only to real users for free, and the display
// resolver short-circuits this id to "USDA" without calling Clerk.
export const USDA_SYSTEM_USER_ID = 'usda';

// Fixed creation timestamp for every seeded row. The in-meal search is ordered
// oldest-first by createdAt, so a stable timestamp keeps the seed's position in
// results from drifting on every re-seed (INSERT OR REPLACE rewrites the row).
export const USDA_SEED_TIMESTAMP = '2024-01-01T00:00:00.000Z';

// A namespace UUID for the USDA seed. Combined with the FDC_ID it yields a stable
// v5 id, so re-running the seed updates the same row instead of duplicating (R7).
const USDA_SEED_NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341';

// Raw CSV row (every cell is a string; empty cells are '').
export type UsdaCsvRow = Record<string, string>;

// The fully-mapped catalog row, one per CSV line.
export interface UsdaSeedRow {
  id: string;
  name: string;
  servingAmount: number;
  servingSizeUnit: 'gram';
  servingSizeDisplayText: null;
  servingsPerPackage: number;
  addedByUserId: string;
  creationSource: 'usda';
  fat: number;
  carbs: number;
  protein: number;
  saturatedFat: number | null;
  unsaturatedFat: null;
  monounsaturatedFat: null;
  polyunsaturatedFat: null;
  transFat: number | null;
  fiber: number | null;
  sugar: number | null;
  addedSugars: null;
  calories: number;
  sugarAlcohol: null;
  allulose: null;
  alcohol: null;
  micronutrients: Micronutrient[];
  productPhotoKey: null;
  labelPhotoKey: null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Deterministic UUIDv5 (RFC 4122) — pure JS so it needs no `node:crypto`.
// ---------------------------------------------------------------------------

function sha1(bytes: number[]): number[] {
  const ml = bytes.length * 8;
  const msg = bytes.slice();
  msg.push(0x80);
  while (msg.length % 64 !== 56) msg.push(0);
  // 64-bit big-endian length; lengths here are tiny so the high word is 0.
  for (let i = 7; i >= 0; i--) msg.push((ml / 2 ** (8 * i)) & 0xff);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const rotl = (n: number, b: number) => ((n << b) | (n >>> (32 - b))) >>> 0;

  for (let chunk = 0; chunk < msg.length; chunk += 64) {
    const w = new Array<number>(80);
    for (let i = 0; i < 16; i++) {
      const j = chunk + i * 4;
      w[i] = ((msg[j]! << 24) | (msg[j + 1]! << 16) | (msg[j + 2]! << 8) | msg[j + 3]!) >>> 0;
    }
    for (let i = 16; i < 80; i++) w[i] = rotl(w[i - 3]! ^ w[i - 8]! ^ w[i - 14]! ^ w[i - 16]!, 1);

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    for (let i = 0; i < 80; i++) {
      let f: number;
      let k: number;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const tmp = (rotl(a, 5) + f + e + k + w[i]!) >>> 0;
      e = d;
      d = c;
      c = rotl(b, 30);
      b = a;
      a = tmp;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const out: number[] = [];
  for (const h of [h0, h1, h2, h3, h4]) {
    out.push((h >>> 24) & 0xff, (h >>> 16) & 0xff, (h >>> 8) & 0xff, h & 0xff);
  }
  return out;
}

function uuidToBytes(uuid: string): number[] {
  const hex = uuid.replace(/-/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < 16; i++) bytes.push(parseInt(hex.slice(i * 2, i * 2 + 2), 16));
  return bytes;
}

function utf8Bytes(str: string): number[] {
  const bytes: number[] = [];
  for (const ch of unescape(encodeURIComponent(str))) bytes.push(ch.charCodeAt(0));
  return bytes;
}

function bytesToUuid(bytes: number[]): string {
  const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function uuidv5(name: string, namespace: string): string {
  const hash = sha1([...uuidToBytes(namespace), ...utf8Bytes(name)]);
  const bytes = hash.slice(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // RFC 4122 variant
  return bytesToUuid(bytes);
}

// Stable catalog id for a USDA row, derived from its FDC_ID (the CSV's unique key).
export function usdaSeedId(fdcId: string): string {
  return uuidv5(`usda:${fdcId}`, USDA_SEED_NAMESPACE);
}

// ---------------------------------------------------------------------------
// Row transform
// ---------------------------------------------------------------------------

// Parse a CSV cell into a number, treating empty/whitespace as absent (null).
function num(cell: string | undefined): number | null {
  if (cell == null) return null;
  const trimmed = cell.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

// A required numeric (calories/macros) — guaranteed present in every curated row.
// Floored at 0: USDA reports carbohydrate "by difference", so a few high-protein/
// high-fat animal foods (e.g. ground bison, raw chicken) round a few hundredths of
// a gram below zero. A negative macro is physically meaningless and fails the read
// schema (carbs >= 0), so we clamp it up to 0 — the same rounding-artifact handling
// clampToTotal applies to sub-values.
function required(cell: string | undefined): number {
  return Math.max(0, num(cell) ?? 0);
}

// A sub-value can't exceed the total it belongs to (USDA per-100g rounding pushes
// a few dairy sugars a hundredth of a gram over carbs). Clamp so seeded rows
// satisfy validateNutritionLabel and never show an impossible breakdown (R5).
function clampToTotal(value: number | null, total: number | null): number | null {
  if (value == null) return null;
  if (total == null) return value;
  return Math.min(value, total);
}

// CSV column → micronutrient (name + unit). Order is fixed so the serialized
// JSON is stable across re-seeds.
const MICRONUTRIENT_COLUMNS: { column: string; name: string; unit: NutritionUnit }[] = [
  { column: 'CHOLESTEROL_MG', name: 'Cholesterol', unit: 'milligram' },
  { column: 'SODIUM_MG', name: 'Sodium', unit: 'milligram' },
  { column: 'CALCIUM_MG', name: 'Calcium', unit: 'milligram' },
  { column: 'IRON_MG', name: 'Iron', unit: 'milligram' },
  { column: 'POTASSIUM_MG', name: 'Potassium', unit: 'milligram' },
  { column: 'VITAMIN_A_MCG_RAE', name: 'Vitamin A', unit: 'microgram' },
  { column: 'VITAMIN_C_MG', name: 'Vitamin C', unit: 'milligram' },
  { column: 'VITAMIN_D_MCG', name: 'Vitamin D', unit: 'microgram' },
];

// Map one CSV row to a catalog row. USDA values are per 100 g, so every entry
// stores servingAmount=100/gram, servingsPerPackage=1 (R4). Absent optional cells
// become null; addedSugars is empty in every curated row, so it is always null.
export function buildUsdaSeedRow(row: UsdaCsvRow): UsdaSeedRow {
  const fat = required(row.TOTAL_FAT_G);
  const carbs = required(row.TOTAL_CARBOHYDRATES_G);
  const protein = required(row.PROTEIN_G);
  const calories = required(row.CALORIES_KCAL);

  const micronutrients: Micronutrient[] = [];
  for (const { column, name, unit } of MICRONUTRIENT_COLUMNS) {
    const amount = num(row[column]);
    if (amount != null) micronutrients.push({ name, amount, unit });
  }

  return {
    id: usdaSeedId(row.FDC_ID ?? ''),
    name: (row.FOOD_DESCRIPTION ?? '').trim(),
    servingAmount: 100,
    servingSizeUnit: 'gram',
    servingSizeDisplayText: null,
    servingsPerPackage: 1,
    addedByUserId: USDA_SYSTEM_USER_ID,
    creationSource: 'usda',
    fat,
    carbs,
    protein,
    saturatedFat: clampToTotal(num(row.SATURATED_FAT_G), fat),
    unsaturatedFat: null,
    monounsaturatedFat: null,
    polyunsaturatedFat: null,
    transFat: clampToTotal(num(row.TRANS_FAT_G), fat),
    fiber: clampToTotal(num(row.DIETARY_FIBER_G), carbs),
    sugar: clampToTotal(num(row.TOTAL_SUGARS_G), carbs),
    addedSugars: null,
    calories,
    sugarAlcohol: null,
    allulose: null,
    alcohol: null,
    micronutrients,
    productPhotoKey: null,
    labelPhotoKey: null,
    createdAt: USDA_SEED_TIMESTAMP,
    updatedAt: USDA_SEED_TIMESTAMP,
  };
}

// ---------------------------------------------------------------------------
// SQL serialization
// ---------------------------------------------------------------------------

// The catalog columns in insert order. Kept beside the value mapping below so the
// two stay in lockstep.
const SEED_COLUMNS = [
  'id',
  'name',
  'serving_amount',
  'serving_size_unit',
  'serving_size_display_text',
  'servings_per_package',
  'added_by_user_id',
  'creation_source',
  'fat',
  'carbs',
  'protein',
  'saturated_fat',
  'unsaturated_fat',
  'monounsaturated_fat',
  'polyunsaturated_fat',
  'trans_fat',
  'fiber',
  'sugar',
  'added_sugars',
  'calories',
  'sugar_alcohol',
  'allulose',
  'alcohol',
  'micronutrients_json',
  'product_photo_key',
  'label_photo_key',
  'created_at',
  'updated_at',
] as const;

function sqlValue(value: string | number | null): string {
  if (value == null) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${value.replace(/'/g, "''")}'`;
}

// One idempotent statement per row. INSERT OR REPLACE force-refreshes the row in
// place on every deploy, so improving the CSV and redeploying updates prod (R7/R8).
export function usdaSeedInsertStatement(seed: UsdaSeedRow): string {
  const micronutrientsJson = seed.micronutrients.length
    ? JSON.stringify(seed.micronutrients)
    : null;
  const values: (string | number | null)[] = [
    seed.id,
    seed.name,
    seed.servingAmount,
    seed.servingSizeUnit,
    seed.servingSizeDisplayText,
    seed.servingsPerPackage,
    seed.addedByUserId,
    seed.creationSource,
    seed.fat,
    seed.carbs,
    seed.protein,
    seed.saturatedFat,
    seed.unsaturatedFat,
    seed.monounsaturatedFat,
    seed.polyunsaturatedFat,
    seed.transFat,
    seed.fiber,
    seed.sugar,
    seed.addedSugars,
    seed.calories,
    seed.sugarAlcohol,
    seed.allulose,
    seed.alcohol,
    micronutrientsJson,
    seed.productPhotoKey,
    seed.labelPhotoKey,
    seed.createdAt,
    seed.updatedAt,
  ];
  return `INSERT OR REPLACE INTO nutrition_database_ingredients (${SEED_COLUMNS.join(', ')}) VALUES (${values.map(sqlValue).join(', ')});`;
}
