# @leanlog/nutrition-evals

An eval harness for nutrition-label scanning. It runs the **real** extraction code
(`@leanlog/nutrition-scan`, the same module the `/api/scan-nutrition` endpoint uses)
against committed fixture images, scores each field against hand-labeled ground truth,
and emits a side-by-side per-field accuracy + cost + latency report per model.

The immediate use is a go/no-go read on migrating `gemini-2.5-flash` →
`gemini-2.5-flash-lite`. It is intentionally **directional**, not a precision benchmark:
~10 fixtures means a single miss swings a field's rate by ~10%.

## Running

```bash
# from the repo root — requires GOOGLE_GENERATIVE_AI_API_KEY
GOOGLE_GENERATIVE_AI_API_KEY=... pnpm run test:evals
```

This is the **only** command that makes model calls. It is excluded from the default
`pnpm test` (pre-push) and from `lint-staged`. Without the API key the suite is skipped
(it is a no-op, not a failure). The run writes `eval-report.md` in this package and
prints the same report to the console.

The pure-logic unit tests (scoring, tolerance, report rendering, fixture loading) run in
the default `pnpm test` and never make model calls.

## How scoring works

Each field is scored independently against ground truth:

- **Numeric** fields (calories, macros, serving size, micronutrient amounts / %DV) pass
  within a **relative** tolerance. Default is ±2%; `calories` is ±5%; micronutrient %DV
  is ±10%. Ground-truth `0` must be matched exactly. Override per field in
  [`src/tolerance.ts`](./src/tolerance.ts).
- **Enum** fields (`basis`, `servingSizeUnit`, micronutrient `unit`) must match exactly.
- **Name / text** fields (`inferredName`, `servingSizeText`, micronutrient names) match
  fuzzily (case-insensitive, containment-tolerant).
- **Micronutrients** are matched by name, then amount / unit / %DV are scored with the
  rules above. The report shows a **coverage** row (did the model find the micronutrient by
  name?) plus three accuracy rows — **amount**, **unit**, **%DV** — each scored over only the
  matched entries where ground truth asserted that sub-field (an unasserted sub-field is
  never counted). Missing, extra, and matched-but-wrong micronutrients are all surfaced in
  the per-fixture misses, so a wrong value on a found micronutrient can't hide behind 100%
  coverage.

Only fields **present in `expected.json`** are scored — ground truth can be partial, so
omit any field you don't want to assert.

---

## Runbook: adding a new fixture

A fixture is one directory under `fixtures/` containing an **image** and an
**`expected.json`**. Adding one requires **no code changes** — the harness iterates
whatever is present.

### 1. Pick a label photo

Use a real nutrition label photo (JPEG, PNG, WebP, or HEIC). Aim for the set to span the
schema's divergence axes — try to ensure the fixtures collectively include:

- each `basis`: `per_serving`, `per_100g`, and `unknown`
- both serving units: `gram` and `milliliter` (a liquid product)
- at least one label with added sugars / sugar alcohol / allulose
- at least one with a long micronutrient list, including `%DV`-only entries
- at least one deliberately hard or low-quality photo

### 2. Create the fixture directory

Copy the template and rename it descriptively (the name shows up in the report):

```bash
cd packages/nutrition-evals/fixtures
cp -r EXAMPLE 004-allulose-per100g
# add the photo (any supported extension; the filename doesn't matter)
cp ~/Downloads/label.jpg 004-allulose-per100g/label.jpg
```

### 3. Hand-label `expected.json`

Edit `004-allulose-per100g/expected.json` to match what the label actually prints. The
shape mirrors the scan schema. **Every key is optional** — include only the fields you
want to assert; anything you omit is not scored.

```jsonc
{
  "basis": "per_100g", // "per_serving" | "per_100g" | "unknown"
  "servingSizeGrams": 30, // numeric grams OR milliliters, or null
  "servingSizeUnit": "gram", // "gram" | "milliliter" | null
  "servingSizeText": "1 bar (30g)", // printed text exactly, or null
  "servingsPerContainer": 12, // number or null
  "nutrients": {
    "calories": 120,
    "fat": 7,
    "saturatedFat": 2,
    "carbs": 14,
    "fiber": 5,
    "protein": 10,
    "sugar": 1, // omit fields the label doesn't show
    "addedSugars": 0,
    "sugarAlcohol": 8,
    "allulose": 6,
  },
  "micronutrients": [
    // match by name; include amount + unit and/or percentDailyValue
    { "name": "Sodium", "amount": 140, "unit": "milligram", "percentDailyValue": 6 },
    { "name": "Iron", "percentDailyValue": 10 }, // %DV-only entry
  ],
  "inferredName": "Almond Allulose Bar",
}
```

Units allowed for micronutrients: `gram`, `milligram`, `microgram`, `milliliter`,
`international_unit`.

### 4. Run and review

```bash
GOOGLE_GENERATIVE_AI_API_KEY=... pnpm run test:evals
```

Open `eval-report.md` (also printed to the console). Confirm your new fixture appears in
the per-field rates and that any misses for it look right (a miss usually means either a
real model error or a mistake in your `expected.json` — double-check the label).

### 5. Commit

Commit the image **and** `expected.json`. Do **not** commit `eval-report.md` (it is
gitignored — it's a generated artifact).

---

## Adding a model to the comparison

Add one entry to `MODELS` in [`src/models.ts`](./src/models.ts) (id, label, and per-MTok
costs). No harness change needed. The first entry is treated as the baseline; the report's
`Δ` column compares the last model against it.
