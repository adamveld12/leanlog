import { useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import {
  Button,
  DateSelect3,
  Input,
  ListSectionCard,
  Modal,
  NumberInput,
  ProgressBar,
  SectionCard,
  StickyFooter,
} from '@leanlog/ui';
import { normalizeIngredientName, prettyDate, round1 } from './lib';
import { dayTotals, mealTotals } from './selectors';
import { useStore } from './state';
import type { Ingredient, SaveSections } from './types';

type IngredientDraft = Omit<Ingredient, 'id'>;

const emptyDraft: IngredientDraft = {
  name: '',
  grams: 0,
  calories: 0,
  fat: 0,
  saturatedFat: 0,
  carbs: 0,
  fiber: 0,
  protein: 0,
};

function useSavedSections() {
  const [saved, setSaved] = useState<SaveSections>({});
  const markSaved = (key: keyof SaveSections) => setSaved((s) => ({ ...s, [key]: true }));
  const markDirty = (key: keyof SaveSections) => setSaved((s) => ({ ...s, [key]: false }));
  return { saved, markSaved, markDirty };
}

function DayList() {
  const nav = useNavigate();
  const { state, addDay, removeDay } = useStore();
  const now = new Date();
  const [picker, setPicker] = useState({
    month: now.getMonth() + 1,
    day: now.getDate(),
    year: now.getFullYear(),
  });
  const toIso = `${picker.year}-${String(picker.month).padStart(2, '0')}-${String(picker.day).padStart(2, '0')}`;
  return (
    <main className="ll-page ll-main">
      <h1 className="ll-page-title">leanlog</h1>
      <SectionCard title="Add day">
        <p className="ll-section-note">Choose month, day, and year to create a new log day.</p>
        <DateSelect3
          month={picker.month}
          day={picker.day}
          year={picker.year}
          onChange={setPicker}
        />
        <Button onClick={() => addDay(toIso)}>Add day</Button>
      </SectionCard>
      <ListSectionCard
        title="Days"
        items={state.days
          .slice()
          .sort((a, b) => (a.date < b.date ? 1 : -1))
          .map((d) => {
            const totals = dayTotals(d);
            return {
              id: d.id,
              title: prettyDate(d.date),
              meta: (
                <>
                  {totals.calories}
                  <span className="ll-unit"> kcal</span> · P {totals.protein}
                  <span className="ll-unit">g</span> · C {totals.carbs}
                  <span className="ll-unit">g</span> · F {totals.fat}
                  <span className="ll-unit">g</span>
                </>
              ),
              onOpen: () => nav(`/day/${d.id}`),
              onDelete: () => removeDay(d.id),
              deleteLabel: 'Delete day',
            };
          })}
      />
      <Link className="ll-btn ll-btn-md ll-btn-subtle" to="/settings">
        Settings
      </Link>
    </main>
  );
}

function DayDetail() {
  const { dayId } = useParams();
  const nav = useNavigate();
  const { state, addMeal, removeMeal } = useStore();
  const day = state.days.find((d) => d.id === dayId);
  if (!day) return <Navigate to="/" replace />;
  const totals = dayTotals(day);
  const netCarbs = round1(Math.max(0, totals.carbs - totals.fiber));

  return (
    <main className="ll-page ll-main">
      <div className="ll-row">
        <Link className="ll-btn ll-btn-sm ll-btn-subtle" to="/">
          ← Back
        </Link>
        <h2 className="ll-page-title">{prettyDate(day.date)}</h2>
      </div>
      <SectionCard title="Daily totals">
        <div className="ll-stack-lg">
          <div className="ll-stack">
            <p className="ll-page-subtitle">
              {totals.calories} / {state.settings.calorieTarget}
              <span className="ll-unit"> kcal</span>
            </p>
            <ProgressBar value={totals.calories} max={state.settings.calorieTarget} />
          </div>
          <p className="ll-meta">
            FAT {totals.fat}
            <span className="ll-unit">g</span>
            <span className="mx-[5px]">·</span>
            NET CARBS {netCarbs}
            <span className="ll-unit">g</span>
            <span className="mx-[5px]">·</span>
            PROTEIN {totals.protein}
            <span className="ll-unit">g</span>
          </p>
          <Button
            className="w-full"
            onClick={() => {
              const meal = addMeal(day.id, `MEAL ${day.meals.length + 1}`);
              if (meal) nav(`/day/${day.id}/meal/${meal.id}`);
            }}
          >
            Add meal
          </Button>
        </div>
      </SectionCard>
      <ListSectionCard
        title={`Meals ${day.meals.length} / ${state.settings.mealCountTarget}`}
        emptyText="No meals yet. Add one above."
        items={day.meals.map((m) => {
          const totals = mealTotals(m);
          return {
            id: m.id,
            title: m.name || 'UNTITLED MEAL',
            meta: (
              <>
                {totals.calories}
                <span className="ll-unit"> kcal</span> · P {totals.protein}
                <span className="ll-unit">g</span> · C {totals.carbs}
                <span className="ll-unit">g</span> · F {totals.fat}
                <span className="ll-unit">g</span>
              </>
            ),
            onOpen: () => nav(`/day/${day.id}/meal/${m.id}`),
            onDelete: () => removeMeal(day.id, m.id),
            deleteLabel: 'Delete meal',
          };
        })}
      />
      <Link className="ll-btn ll-btn-md ll-btn-subtle" to="/">
        Back
      </Link>
    </main>
  );
}

function IngredientEditor({
  value,
  onChange,
  onBlur,
}: {
  value: IngredientDraft;
  onChange: (next: IngredientDraft) => void;
  onBlur: () => void;
}) {
  const warnSat = value.saturatedFat > value.fat;
  const warnFiber = value.fiber > value.carbs;
  return (
    <div className="ll-stack">
      <Input
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        normalizeOnBlur={normalizeIngredientName}
        onNormalized={(name) => onChange({ ...value, name })}
      />
      <NumberInput
        label="Grams"
        value={value.grams}
        onChange={(n) => onChange({ ...value, grams: n })}
        onBlur={onBlur}
      />
      <NumberInput
        label="Calories"
        value={value.calories}
        onChange={(n) => onChange({ ...value, calories: n })}
        onBlur={onBlur}
      />
      <NumberInput
        label="Fat"
        value={value.fat}
        onChange={(n) => onChange({ ...value, fat: n })}
        onBlur={onBlur}
      />
      <NumberInput
        label="Sat fat"
        value={value.saturatedFat}
        onChange={(n) => onChange({ ...value, saturatedFat: n })}
        onBlur={onBlur}
      />
      {warnSat ? <small className="ll-warn">Saturated fat is higher than total fat.</small> : null}
      <NumberInput
        label="Carbs"
        value={value.carbs}
        onChange={(n) => onChange({ ...value, carbs: n })}
        onBlur={onBlur}
      />
      <NumberInput
        label="Fiber"
        value={value.fiber}
        onChange={(n) => onChange({ ...value, fiber: n })}
        onBlur={onBlur}
      />
      {warnFiber ? <small className="ll-warn">Fiber is higher than total carbs.</small> : null}
      <NumberInput
        label="Protein"
        value={value.protein}
        onChange={(n) => onChange({ ...value, protein: n })}
        onBlur={onBlur}
      />
    </div>
  );
}

function MealEdit() {
  const { dayId, mealId } = useParams();
  const nav = useNavigate();
  const { state, renameMeal, removeMeal, upsertIngredient, removeIngredient } = useStore();
  const day = state.days.find((d) => d.id === dayId);
  const meal = day?.meals.find((m) => m.id === mealId);
  const [draft, setDraft] = useState<IngredientDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showBlankNamePrompt, setShowBlankNamePrompt] = useState(false);
  const { saved, markDirty, markSaved } = useSavedSections();

  if (!day || !meal) return <Navigate to="/" replace />;

  const persistDraft = () =>
    setDraft((d) => ({
      ...d,
      grams: round1(d.grams),
      calories: round1(d.calories),
      fat: round1(d.fat),
      saturatedFat: round1(d.saturatedFat),
      carbs: round1(d.carbs),
      fiber: round1(d.fiber),
      protein: round1(d.protein),
      name: normalizeIngredientName(d.name),
    }));

  const saveIngredient = () => {
    const next: Ingredient = {
      id: editingId ?? uuid(),
      ...draft,
      name: normalizeIngredientName(draft.name),
    };
    upsertIngredient(day.id, meal.id, next);
    markSaved('ingredientForm');
    setDraft(emptyDraft);
    setEditingId(null);
  };

  const totals = mealTotals(meal);

  return (
    <main className="ll-page ll-main">
      <h2 className="ll-page-title">{meal.name || 'Meal'}</h2>
      <SectionCard title="Meal name" saved={saved.mealName}>
        <p className="ll-section-note">Name is required before leaving this page.</p>
        <Input
          value={meal.name}
          onChange={(e) => {
            markDirty('mealName');
            renameMeal(day.id, meal.id, e.target.value);
            markSaved('mealName');
          }}
          normalizeOnBlur={normalizeIngredientName}
          onNormalized={(name) => {
            markDirty('mealName');
            renameMeal(day.id, meal.id, name);
            markSaved('mealName');
          }}
        />
        <div className="ll-row">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              if (!meal.name.trim()) {
                setShowBlankNamePrompt(true);
                return;
              }
              nav(`/day/${day.id}`);
            }}
          >
            Back
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              removeMeal(day.id, meal.id);
              nav(`/day/${day.id}`);
            }}
          >
            Delete meal and all ingredients
          </Button>
        </div>
      </SectionCard>

      <ListSectionCard
        title="Ingredients"
        saved={saved.ingredientForm}
        note="Tap an ingredient row to edit values."
        items={meal.ingredients.map((i) => ({
          id: i.id,
          title: i.name,
          meta: (
            <>
              {i.calories}
              <span className="ll-unit"> kcal</span> · F {i.fat}
              <span className="ll-unit">g</span> · C {i.carbs}
              <span className="ll-unit">g</span> · P {i.protein}
              <span className="ll-unit">g</span>
            </>
          ),
          onOpen: () => {
            setEditingId(i.id);
            setDraft(i);
          },
          onDelete: () => removeIngredient(day.id, meal.id, i.id),
          deleteLabel: 'Delete ingredient',
        }))}
      >
        <IngredientEditor
          value={draft}
          onChange={(next) => {
            markDirty('ingredientForm');
            setDraft(next);
          }}
          onBlur={persistDraft}
        />
        <Button onClick={saveIngredient}>
          {editingId ? 'Update ingredient' : 'Add ingredient'}
        </Button>
      </ListSectionCard>

      <StickyFooter>
        <strong className="ll-page-subtitle">
          {totals.calories}
          <span className="ll-unit"> kcal</span> · P {totals.protein}
          <span className="ll-unit">g</span> · C {totals.carbs}
          <span className="ll-unit">g</span> · F {totals.fat}
          <span className="ll-unit">g</span>
        </strong>
      </StickyFooter>

      <Modal
        open={showBlankNamePrompt}
        title="Meal name is required"
        onClose={() => setShowBlankNamePrompt(false)}
      >
        <p>Name this meal before leaving, or discard this whole meal draft.</p>
        <div className="ll-row">
          <Button onClick={() => setShowBlankNamePrompt(false)}>Stay and edit</Button>
          <Button
            variant="danger"
            onClick={() => {
              removeMeal(day.id, meal.id);
              nav(`/day/${day.id}`);
            }}
          >
            Discard meal draft and all ingredients
          </Button>
        </div>
      </Modal>
    </main>
  );
}

function Settings() {
  const { state, setState } = useStore();
  const { saved, markDirty, markSaved } = useSavedSections();
  const [importError, setImportError] = useState('');
  const updateTargets = (patch: Partial<typeof state.settings>) => {
    markDirty('targets');
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
    markSaved('targets');
  };

  return (
    <main className="ll-page ll-main">
      <h2 className="ll-page-title">Settings</h2>
      <SectionCard title="Targets" saved={saved.targets}>
        <p className="ll-section-note">Changes save immediately.</p>
        <NumberInput
          label="Calories"
          value={state.settings.calorieTarget}
          onChange={(n) => updateTargets({ calorieTarget: n })}
          onBlur={() => updateTargets({ calorieTarget: round1(state.settings.calorieTarget) })}
        />
        <NumberInput
          label="Meal count"
          value={state.settings.mealCountTarget}
          onChange={(n) => updateTargets({ mealCountTarget: n })}
          onBlur={() => updateTargets({ mealCountTarget: round1(state.settings.mealCountTarget) })}
        />
        {(['fat', 'saturatedFat', 'carbs', 'fiber', 'protein'] as const).map((k) => (
          <NumberInput
            key={k}
            label={k}
            value={state.settings.macroTargets[k]}
            onChange={(n) =>
              updateTargets({ macroTargets: { ...state.settings.macroTargets, [k]: n } })
            }
            onBlur={() =>
              updateTargets({
                macroTargets: {
                  ...state.settings.macroTargets,
                  [k]: round1(state.settings.macroTargets[k]),
                },
              })
            }
          />
        ))}
      </SectionCard>

      <SectionCard title="Theme" saved={saved.theme}>
        <div className="ll-row flex-wrap">
          {(['system', 'light', 'dark'] as const).map((theme) => (
            <Button
              key={theme}
              variant={state.settings.theme === theme ? 'primary' : 'ghost'}
              onClick={() => {
                markDirty('theme');
                setState((s) => ({ ...s, settings: { ...s.settings, theme } }));
                markSaved('theme');
              }}
            >
              {theme}
            </Button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Data" saved={saved.data}>
        <p className="ll-section-note">Import replaces all existing data.</p>
        <Button
          onClick={() => {
            const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'leanlog-export.json';
            a.click();
            markSaved('data');
          }}
        >
          Export
        </Button>
        <Input
          type="file"
          accept="application/json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const parsed = JSON.parse(await file.text());
              if (parsed.version !== 1 || !Array.isArray(parsed.days) || !parsed.settings) {
                throw new Error('Invalid state schema. Import failed.');
              }
              if (
                !window.confirm(
                  'Replace all existing data with imported file? This cannot be undone.',
                )
              )
                return;
              setState(parsed);
              setImportError('');
              markSaved('data');
            } catch (error) {
              setImportError(error instanceof Error ? error.message : 'Import failed');
            }
          }}
        />
        {importError ? <small className="ll-warn">{importError}</small> : null}
      </SectionCard>

      <Link className="ll-btn ll-btn-md ll-btn-subtle" to="/">
        Back
      </Link>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DayList />} />
      <Route path="/day/:dayId" element={<DayDetail />} />
      <Route path="/day/:dayId/meal/:mealId" element={<MealEdit />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}
