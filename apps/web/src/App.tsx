import { useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import {
  Button,
  DateSelect3,
  Input,
  Modal,
  NumberInput,
  ProgressBar,
  SectionCard,
  StickyFooter,
  SwipeRow,
  Tabs,
} from '@leanlog/ui';
import { ingredientDedupeKey, normalizeIngredientName, parseNum, prettyDate, round1 } from './lib';
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
        <DateSelect3
          month={picker.month}
          day={picker.day}
          year={picker.year}
          onChange={setPicker}
        />
        <Button onClick={() => addDay(toIso)}>Add day</Button>
      </SectionCard>
      <div className="ll-stack">
        {state.days
          .slice()
          .sort((a, b) => (a.date < b.date ? 1 : -1))
          .map((d) => {
            const totals = dayTotals(d);
            return (
              <SwipeRow key={d.id} onDelete={() => removeDay(d.id)} deleteLabel="Delete day">
                <SectionCard>
                  <div className="ll-row ll-between">
                    <Link className="ll-link-btn" to={`/day/${d.id}`}>
                      {prettyDate(d.date)}
                    </Link>
                    <Button
                      size="sm"
                      variant="danger"
                      className="desktop-only"
                      onClick={() => removeDay(d.id)}
                    >
                      Delete day
                    </Button>
                  </div>
                  <small className="ll-meta">
                    {totals.calories} kcal · P {totals.protein} · C {totals.carbs} · F {totals.fat}
                  </small>
                </SectionCard>
              </SwipeRow>
            );
          })}
      </div>
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

  return (
    <main className="ll-page ll-main">
      <h2 className="ll-page-title">{prettyDate(day.date)}</h2>
      <SectionCard title="Daily totals">
        <div className="ll-stack">
          <div className="ll-stack">
            <p className="ll-page-subtitle">
              {totals.calories} / {state.settings.calorieTarget} kcal
            </p>
            <ProgressBar value={totals.calories} max={state.settings.calorieTarget} />
          </div>
          <div className="ll-stack">
            <p className="ll-page-subtitle">
              Meals {day.meals.length} / {state.settings.mealCountTarget}
            </p>
            <ProgressBar value={day.meals.length} max={state.settings.mealCountTarget} />
          </div>
        </div>
      </SectionCard>
      <Button
        onClick={() => {
          const meal = addMeal(day.id, `MEAL ${day.meals.length + 1}`);
          if (meal) nav(`/day/${day.id}/meal/${meal.id}`);
        }}
      >
        Add meal
      </Button>
      {day.meals.map((m) => {
        const totals = mealTotals(m);
        return (
          <SwipeRow key={m.id} onDelete={() => removeMeal(day.id, m.id)} deleteLabel="Delete meal">
            <SectionCard>
              <div className="ll-row ll-between">
                <Link className="ll-link-btn" to={`/day/${day.id}/meal/${m.id}`}>
                  {m.name || 'UNTITLED MEAL'}
                </Link>
                <Button
                  size="sm"
                  variant="danger"
                  className="desktop-only"
                  onClick={() => removeMeal(day.id, m.id)}
                >
                  Delete meal
                </Button>
              </div>
              <small className="ll-meta">{totals.calories} kcal</small>
            </SectionCard>
          </SwipeRow>
        );
      })}
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
        onChange={(e) => onChange({ ...value, name: normalizeIngredientName(e.target.value) })}
      />
      <NumberInput
        label="Grams"
        value={String(value.grams)}
        onChange={(n) => onChange({ ...value, grams: parseNum(n) })}
        onBlur={onBlur}
      />
      <NumberInput
        label="Calories"
        value={String(value.calories)}
        onChange={(n) => onChange({ ...value, calories: parseNum(n) })}
        onBlur={onBlur}
      />
      <NumberInput
        label="Fat"
        value={String(value.fat)}
        onChange={(n) => onChange({ ...value, fat: parseNum(n) })}
        onBlur={onBlur}
      />
      <NumberInput
        label="Sat fat"
        value={String(value.saturatedFat)}
        onChange={(n) => onChange({ ...value, saturatedFat: parseNum(n) })}
        onBlur={onBlur}
      />
      {warnSat ? <small className="ll-warn">Saturated fat is higher than total fat.</small> : null}
      <NumberInput
        label="Carbs"
        value={String(value.carbs)}
        onChange={(n) => onChange({ ...value, carbs: parseNum(n) })}
        onBlur={onBlur}
      />
      <NumberInput
        label="Fiber"
        value={String(value.fiber)}
        onChange={(n) => onChange({ ...value, fiber: parseNum(n) })}
        onBlur={onBlur}
      />
      {warnFiber ? <small className="ll-warn">Fiber is higher than total carbs.</small> : null}
      <NumberInput
        label="Protein"
        value={String(value.protein)}
        onChange={(n) => onChange({ ...value, protein: parseNum(n) })}
        onBlur={onBlur}
      />
    </div>
  );
}

function MealEdit() {
  const { dayId, mealId } = useParams();
  const nav = useNavigate();
  const {
    state,
    renameMeal,
    removeMeal,
    upsertIngredient,
    removeIngredient,
    addFromLibrary,
    saveIngredientToLibrary,
  } = useStore();
  const day = state.days.find((d) => d.id === dayId);
  const meal = day?.meals.find((m) => m.id === mealId);
  const [tab, setTab] = useState('library');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<IngredientDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showBlankNamePrompt, setShowBlankNamePrompt] = useState(false);
  const [showDedupePrompt, setShowDedupePrompt] = useState<string | null>(null);
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
    const existing = state.ingredientLibrary.find(
      (i) => ingredientDedupeKey(i.name) === ingredientDedupeKey(next.name),
    );
    if (existing) {
      setShowDedupePrompt(existing.id);
    } else {
      saveIngredientToLibrary(next);
      markSaved('addIngredientFlow');
    }
    setDraft(emptyDraft);
    setEditingId(null);
  };

  const totals = mealTotals(meal);
  const filteredLibrary = state.ingredientLibrary
    .filter((i) => i.name.includes(search.toUpperCase()))
    .sort((a, b) => (a.lastUsedAt < b.lastUsedAt ? 1 : -1));

  return (
    <main className="ll-page ll-main">
      <h2 className="ll-page-title">{meal.name || 'Meal'}</h2>
      <SectionCard title="Meal name" saved={saved.mealName}>
        <Input
          value={meal.name}
          onChange={(e) => {
            markDirty('mealName');
            renameMeal(day.id, meal.id, normalizeIngredientName(e.target.value));
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

      <SectionCard title="Ingredients" saved={saved.ingredientForm}>
        {meal.ingredients.map((i) => (
          <div className="ll-row ll-between" key={i.id}>
            <button
              type="button"
              className="ll-link-btn"
              onClick={() => {
                setEditingId(i.id);
                setDraft(i);
              }}
            >
              {i.name} · {i.calories} kcal
            </button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => removeIngredient(day.id, meal.id, i.id)}
            >
              Delete ingredient
            </Button>
          </div>
        ))}
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
      </SectionCard>

      <SectionCard title="Add from library" saved={saved.addIngredientFlow}>
        <Tabs
          tabs={[
            { key: 'library', label: 'From library' },
            { key: 'new', label: 'New' },
          ]}
          active={tab}
          onChange={setTab}
        />
        {tab === 'library' ? (
          <>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
            />
            <div className="ll-stack">
              {filteredLibrary.map((item) => (
                <div className="ll-row ll-between" key={item.id}>
                  <span>{item.name}</span>
                  <Button
                    onClick={() => {
                      addFromLibrary(day.id, meal.id, item.id);
                      markSaved('addIngredientFlow');
                    }}
                  >
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p>Use ingredient editor above and save to add new + library.</p>
        )}
      </SectionCard>

      <StickyFooter>
        <strong className="ll-page-subtitle">
          {totals.calories} kcal · P {totals.protein} · C {totals.carbs} · F {totals.fat}
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

      <Modal
        open={Boolean(showDedupePrompt)}
        title="Ingredient name already exists"
        onClose={() => setShowDedupePrompt(null)}
      >
        <p>This ingredient already exists in your library. Update the existing entry?</p>
        <div className="ll-row">
          <Button
            onClick={() => {
              if (showDedupePrompt)
                saveIngredientToLibrary({ id: uuid(), ...draft }, showDedupePrompt);
              setShowDedupePrompt(null);
              markSaved('addIngredientFlow');
            }}
          >
            Update existing library entry
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              saveIngredientToLibrary({ id: uuid(), ...draft });
              setShowDedupePrompt(null);
              markSaved('addIngredientFlow');
            }}
          >
            Save as new anyway
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
        <NumberInput
          label="Calories"
          value={String(state.settings.calorieTarget)}
          onChange={(n) => updateTargets({ calorieTarget: parseNum(n) })}
          onBlur={() => updateTargets({ calorieTarget: round1(state.settings.calorieTarget) })}
        />
        <NumberInput
          label="Meal count"
          value={String(state.settings.mealCountTarget)}
          onChange={(n) => updateTargets({ mealCountTarget: parseNum(n) })}
          onBlur={() => updateTargets({ mealCountTarget: round1(state.settings.mealCountTarget) })}
        />
        {(['fat', 'saturatedFat', 'carbs', 'fiber', 'protein'] as const).map((k) => (
          <NumberInput
            key={k}
            label={k}
            value={String(state.settings.macroTargets[k])}
            onChange={(n) =>
              updateTargets({ macroTargets: { ...state.settings.macroTargets, [k]: parseNum(n) } })
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
        <div className="ll-row">
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
