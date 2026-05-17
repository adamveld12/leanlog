# Leanlog — Product Requirements Document

## 1. Overview

**Leanlog** is a lightweight, mobile-first React web app for tracking daily meals, calories, and macronutrients. All data is stored in the browser via `localStorage` — no backend, no accounts, no sync. JSON export/import is available for manual backup.

## 2. Goals & Non-Goals

**Goals**

- Frictionless daily logging of meals and ingredients on mobile
- Visibility into daily totals vs. user-defined targets (calories + macros)
- Manual backup via JSON export/import

**Non-Goals (v1)**

- Multi-device sync, accounts, or cloud storage
- Barcode scanning or third-party nutrition database integration (USDA, etc.)
- Recipes, meal templates, or weekly meal planning
- Charts, trend analysis, or historical reporting
- Micronutrient tracking (sodium, sugar, cholesterol, etc.)

## 3. Tech Stack

- **Framework:** React (functional components + hooks) + TypeScript
- **Build:** Vite
- **State:** React state + `localStorage` persistence (custom hook, e.g. `useLocalStorage`)
- **Routing:** React Router (day list, day detail, meal edit, settings)
- **Styling:** Tailwind (mobile-first, responsive up to desktop) with CSS variables for theming
- **Theming:** light + dark with toggle in settings; defaults to `prefers-color-scheme`
- **Deployment:** Cloudflare Pages (static build, `dist/` output, SPA fallback to `index.html`)

## 4. Data Model

All data lives under a single root key in `localStorage` (e.g. `mealTracker.v1`) as a JSON blob. All nutrition values are stored as **absolute values** — no per-100g scaling.

```ts
type AppState = {
  version: 1;
  settings: Settings;
  days: Day[];
};

type Settings = {
  calorieTarget: number; // kcal
  mealCountTarget: number; // e.g. 3
  macroTargets: {
    fat: number; // grams
    saturatedFat: number; // grams
    carbs: number; // grams
    fiber: number; // grams
    protein: number; // grams
  };
  theme: 'system' | 'light' | 'dark';
};

type Day = {
  id: string; // uuid
  date: string; // ISO date, e.g. "2026-05-17"
  meals: Meal[];
};

type Meal = {
  id: string;
  name: string; // required, free text
  ingredients: Ingredient[];
};

type Ingredient = {
  id: string;
  name: string;
  grams: number;
  calories: number; // absolute kcal as entered
  fat: number; // grams
  saturatedFat: number; // grams
  carbs: number; // grams
  fiber: number; // grams
  protein: number; // grams
};
```

## 5. Screens

### 5.1 Day List View (route: `/`)

- Header with app title and a settings icon (opens Settings)
- List of days, sorted newest first
  - Each row: date (formatted as "Today", "Yesterday", or "May 14"), total calories, compact macro summary (e.g. "P 120g · C 200g · F 60g")
  - Visual indicator (color or icon) if calories are within / over target
- Floating **+** button in the bottom-right to add a new day
  - Opens a date picker; defaults to today; prevents duplicates (one day per date)
- **First-open behavior:** if no days exist, auto-create today's day
- **Swipe-left on a day row** reveals a delete action; tap shows confirmation dialog before destroying the day and all its meals
- Tapping a row opens Day Detail

### 5.2 Day Detail View (route: `/day/:dayId`)

- Header: date, back button, settings icon
- **Daily totals panel** (sticky at top): for each metric, shows `current / target` with a progress bar
  - Calories
  - Meal count
  - Fat (with saturated fat broken out underneath)
  - Carbs (with fiber broken out)
  - Protein
- **Meals list**: each row shows meal name, calorie total, macro summary
- Floating **+** button adds a new meal → prompts for a name, then opens Meal Edit
- Tapping a meal row opens Meal Edit for that meal
- Swipe-left on a meal row reveals delete (with confirmation)

### 5.3 Meal Edit View (route: `/day/:dayId/meal/:mealId`)

- Header: meal name (editable inline — required, cannot be blank), back button, delete button
- **Ingredients list**: each row shows name, grams, calories, with edit/remove affordances
- **Add ingredient** uses a single inline form with name, grams, calories, fat, saturated fat, carbs, fiber, protein.
- Inline editing: tap an existing ingredient row to edit any field
- **Floating footer (sticky bottom)**: running totals for the meal — calories, fat (with saturated), carbs (with fiber), protein
- Auto-saves on every change; back button returns to Day Detail
- If meal name is blank when leaving, prompt to name it or discard

### 5.4 Settings (route: `/settings`)

- **Appearance**
  - Theme: System / Light / Dark
- **Targets**
  - Calorie target
  - Meal count target
  - Macro targets: fat, saturated fat, carbs, fiber, protein (grams)
- **Data**
  - Export: download a JSON file containing the full app state
  - Import: upload a JSON file; confirmation modal warns that existing data will be replaced; validate schema before applying
- Settings apply globally to every day

## 6. Layout & Responsiveness

- **Mobile-first** (target: ~375–430px width). All primary interactions designed for thumb reach.
- **Responsive to desktop**: at wider breakpoints, content centers in a max-width column (~480–600px) with whitespace on either side. No multi-column layouts in v1.

## 7. Key Interactions & Edge Cases

- **Persistence:** all writes go to `localStorage` after each state change. Wrap in try/catch to surface quota errors.
- **Empty states:** day list shows prompt to add one (though first-open auto-creates today); empty day shows prompt to add a meal; empty meal shows the floating footer at zeros.
- **Duplicate dates:** prevented at day creation.
- **Required meal name:** enforced before navigating away from Meal Edit.
- **Macro consistency:** saturated fat ≤ total fat; fiber ≤ total carbs. Warn inline but don't block save.
- **Number inputs:** allow decimals; validate non-negative.
- **Import validation:** check `version` field and required shape; reject malformed JSON with a clear error.
- **Destructive actions:** day delete, meal delete, and import all require explicit confirmation.

## 8. Out of Scope for v1

- Recipes / saved meal templates / multi-ingredient combos
- Multi-day copy ("repeat yesterday's breakfast")
- Charts, weekly summaries, streaks
- Water tracking, micronutrients
- Photos
- Per-day target overrides
- Trans fat tracking
- Cloud sync, accounts, multi-device

## 9. Design Source of Truth

Design guidance lives in:

- `docs/design-reference.md`
- `docs/design-system.md`

## 10. Deployment

- **Host:** Cloudflare Pages
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **SPA fallback:** include a `_redirects` file in `public/` with `/* /index.html 200` so client-side routes work on direct load and refresh
- **Node version:** pinned via `.nvmrc` or Cloudflare Pages env (Node 20+)
- **No environment variables required** — fully static, no backend

---

Ready to build on your sign-off.
