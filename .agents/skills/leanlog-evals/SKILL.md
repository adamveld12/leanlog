---
name: leanlog-evals
description: |
    🧪 Run, grow, read, and improve the LeanLog nutrition-scan eval harness.
    Use this skill WHENEVER the user mentions evals, the eval harness, nutrition-scan
    accuracy, comparing models (e.g. gemini-2.5-flash vs flash-lite), adding a label
    fixture, reading an eval report on a PR, or improving / fixing an eval score —
    even if they don't say the word "eval" explicitly. Triggers include:
    - "run the evals" / "run test:evals"
    - "add a label / fixture to the evals"
    - "what does the eval report say" / "read the eval report on the PR"
    - "is flash-lite good enough" / "should we switch models"
    - "improve the eval score" / "the eval is failing on field X"
argument-hint: "[run | add-fixture | read-report <PR url> | improve]"
---

# LeanLog Nutrition-Scan Evals

This skill operates the eval harness that grades nutrition-label scanning. Use it to run
evals, add labeled fixtures, interpret the report posted on GitHub PRs, and improve the
score. Always prefer the real harness and the real shared code path over guessing.

## Mental model (read this first)

The eval exists to make a **go/no-go** call on swapping the production scan model (today
`gemini-2.5-flash` → `gemini-2.5-flash-lite`) **without flying blind on accuracy**. Two
packages matter:

- **`@leanlog/nutrition-scan`** (`packages/nutrition-scan`) — the single source of truth
  for extraction. `src/prompt.ts` (the prompt), `src/schema.ts` (the Zod output schema),
  `src/extract.ts` (`extractNutritionLabel({ image, mediaType, apiKey, model })`). Both the
  production endpoint (`apps/web/functions/api/scan-nutrition.ts`) and the eval import this,
  so the eval grades **exactly** the prompt that ships. Editing the prompt here changes both.
- **`@leanlog/nutrition-evals`** (`packages/nutrition-evals`) — the harness.
  - `fixtures/<case>/{image, expected.json}` — committed ground truth.
  - `src/scoring.ts` — per-field scoring. `src/tolerance.ts` — numeric tolerance.
    `src/models.ts` — the model list + cost table. `src/report.ts` — markdown report.
  - `src/evals.evals.test.ts` — the live harness (the only thing that calls models).

**It is directional, not precise.** ~10 fixtures means one miss swings a field's rate by
~10%, and models are non-deterministic — the same fixture can pass one run and miss the
next. Never treat a single run as ground truth; look across runs and at per-fixture misses.

## Choose the task

Figure out which of these the user wants, then jump to that section:

1. **Run the evals** → run `test:evals` locally and read the report.
2. **Add a fixture** → drop in a labeled image so the set grows.
3. **Read a PR report** → interpret the report comment and make a go/no-go call.
4. **Improve the score** → diagnose a miss and fix the right thing.

---

## 1. Run the evals

The harness makes real model calls, so it is isolated from the default test suite.

```bash
# from the repo root — requires the Google key
GOOGLE_GENERATIVE_AI_API_KEY=... pnpm run test:evals
```

- This is the **only** command that calls models. It is excluded from `pnpm test`
  (pre-push) and from `lint-staged`. Without the key the suite **skips cleanly** (no-op,
  not a failure) — if a run reports "1 skipped", the key is missing.
- It writes `packages/nutrition-evals/eval-report.md` (gitignored — never commit it) and
  prints the same report to the console.
- The pure-logic unit tests (scoring, tolerance, report, fixture loader) run under the
  normal `pnpm test` and never call models. Run them after editing harness code.

After a run, read the report top-to-bottom: per-field pass rates per model, the Δ column,
the micronutrient coverage and accuracy rows, then the cost/latency/token summary and
per-fixture misses.

## 2. Add a fixture

A fixture is one directory under `packages/nutrition-evals/fixtures/` with an **image** and
an **`expected.json`**. Adding one requires **no code changes** — the harness iterates
whatever is present.

**The authoritative step-by-step runbook lives in
`packages/nutrition-evals/README.md` ("Runbook: adding a new fixture"). Read it and follow
it.** The essentials:

- Copy the `EXAMPLE/` template to a descriptive name (the name shows up in the report),
  e.g. `004-allulose-per100g/`.
- Drop in the real label photo (`.jpg/.jpeg/.png/.webp/.heic`; filename doesn't matter).
- Hand-label `expected.json` to match what the label **prints**. The shape mirrors the scan
  schema and **every key is optional** — assert only fields you're confident about; omitted
  fields are not scored. Units for micronutrients: `gram`, `milligram`, `microgram`,
  `milliliter`, `international_unit`.
- Commit the **image + `expected.json`** (not the report).

**Labeling judgment** that the runbook can't decide for you:
- Use `null` for a metric field the label genuinely doesn't show (e.g.
  `servingSizeGrams: null`). That asserts "unreadable", and is scored.
- For a footnote like "not a significant source of total sugars", **omit** the optional
  nutrient rather than asserting `0` — a model that omits it shouldn't be marked wrong, and
  ground-truth `0` must be matched exactly.
- A printed zero (e.g. "Sodium 0mg") is real ground truth, but models often drop zero-value
  micronutrients. Asserting it is legitimate and surfaces thoroughness differences; just
  know it will read as a coverage miss when a model omits it.

**Grow toward the divergence axes.** Aim for the set to collectively cover: each `basis`
(`per_serving`, `per_100g`, `unknown`); both serving units (`gram`, `milliliter`); a label
with added sugars / sugar alcohol / allulose; a long micronutrient list including %DV-only
entries; and at least one deliberately hard / low-quality photo. When asked to add a
fixture, prefer one that fills a gap in the current set.

After adding, run `test:evals` (section 1) to confirm the fixture loads and grades, and
sanity-check that its misses reflect the model — not a typo in your `expected.json`.

## 3. Read a PR report (go/no-go)

CI runs the harness on PRs that touch `packages/nutrition-evals/**` or
`packages/nutrition-scan/**` (path-filtered, **non-blocking** — it never gates merge) and
posts the report as a **sticky comment** (header `nutrition-scan-evals`, author
`github-actions[bot]`) and as an uploaded artifact named `eval-report`.

To fetch it, read the PR's comments with whatever GitHub tooling is available in the current
environment (the GitHub MCP comment/PR tools, or `gh pr view --comments`) and find the
sticky comment by its `nutrition-scan-evals` header. To re-read CI run status, use the
corresponding GitHub Actions tooling.

**How to read it:**
- The first model column is the **baseline**; the last is the **candidate**. The `Δ` column
  is candidate − baseline (negative = regression).
- **Micronutrients are scored on two axes.** `micronutrient cov` is name coverage (did it
  find the entry?). Then three sub-field rows — `micronutrient amount`, `micronutrient unit`,
  `micronutrient %DV` — score, over only the entries where ground truth asserted that
  sub-field, whether the matched values are right. Green coverage with a dropping sub-field
  row means the model finds micros but gets that value wrong; check the per-fixture
  `wrong micros: <name> (amount/unit/%DV)` lines.
- **Per-field deltas are the actionable signal.** A −X% on a field tells you *what*
  regressed, which matters more than an aggregate. Cross-reference the **per-fixture misses**
  section: a miss isolated to one hard photo is weaker evidence than the same field missing
  across several fixtures.
- Weigh the **cost + latency** win against accuracy deltas. flash-lite is meaningfully
  cheaper/faster; the question is whether accuracy holds.
- **Account for non-determinism.** With ~10 fixtures a single −10% may be one flaky miss.
  If a delta is decision-relevant, re-run (push again, or run locally) and see if it holds.

**Make the call:** recommend the candidate when there's **no meaningful, repeatable field
regression** and the cost/latency win is real. If a field regresses repeatably, say which
field and treat it as a blocker for the swap — not for the PR (the eval never gates merge;
the actual model switch is a separate change).

## 4. Improve the eval score

**Diagnose before changing anything.** A miss is one of four things — open the fixture's
image and `expected.json` and decide which:

| Cause | Fix |
| --- | --- |
| Ground truth is wrong (typo, misread label) | Fix `expected.json`. Re-run. |
| Tolerance too strict for a legitimately-close number | Adjust the per-field entry in `src/tolerance.ts`. |
| The model genuinely reads this field worse | Improve the shared prompt in `nutrition-scan/src/prompt.ts`. |
| High variance / one flaky fixture | Add more fixtures; re-run to confirm it's noise. |

Guidance per lever:

- **Prompt (`packages/nutrition-scan/src/prompt.ts`).** This is the highest-leverage and
  most legitimate fix: add an explicit instruction for the field that's read poorly (e.g.
  how to handle a volume serving, or to always emit printed zero-value micronutrients).
  Because the endpoint and eval share this file, the next run grades the new prompt with no
  other edit — and the production scan improves too. Re-run `test:evals` to measure.
- **Tolerance (`packages/nutrition-evals/src/tolerance.ts`).** Relative-only by design
  (default ±2%; `calories` ±5%; micronutrient %DV ±10%). Loosen a band **only** when the
  model's value is genuinely close and the strictness is the artifact — never to paper over
  a real regression, which would defeat the harness's purpose. Ground-truth `0` is always
  exact. Add tests in `src/scoring.test.ts` / `tolerance` when you change scoring behavior.
- **Fixtures.** More fixtures cut variance and make per-field rates trustworthy. If a single
  zero-value micronutrient assertion causes noisy coverage swings and you decide it's not
  worth measuring, drop that entry from `expected.json` (a labeling decision, not a code
  change).
- **Schema (`nutrition-scan/src/schema.ts`).** Rarely the fix. Changing it affects the
  production contract and `resolveScan` post-processing — coordinate that as its own change,
  not a score tweak.

**Always re-run `test:evals` after a change** and confirm the field improved without
regressing others. After editing harness code, also run `pnpm test` and `pnpm lint` so the
pre-commit/pre-push gates pass. Commit prompt/schema changes and eval-code changes
separately from fixture additions when practical, with conventional-commit messages.

## Guardrails

- Never commit `eval-report.md` (gitignored — it's a generated artifact).
- Never loosen tolerance or delete a fixture to make a number look better while hiding a
  real regression. The eval's value is honesty about quality.
- Keep `@leanlog/data-access` free of AI-SDK dependencies — extraction lives in
  `@leanlog/nutrition-scan`.
- The eval is non-blocking and the production model switch is a **separate** change; merging
  a PR is never blocked on eval numbers.
- The eval baseline in `nutrition-evals/src/models.ts` is a **separate list** from the
  endpoint's `MODEL` constant in `scan-nutrition.ts`. When the production model changes,
  update the eval's baseline entry to match — there's no automatic link between them.
