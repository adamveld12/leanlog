import { useState } from 'react';
import posthog from 'posthog-js';
import {
  BodyTrackingCard,
  DailyTotalsCard,
  MealSectionCard,
  SIMPLE_NAV_LINKS,
  SimpleEntryTemplate,
  useAnalytics,
} from '@leanlog/ui';
import {
  findSectionMeal,
  groupDayIntoSections,
  SIMPLE_SECTIONS,
  uuidv7,
  type DailyMealLog,
  type SimpleSection,
  type SimpleSectionKey,
} from '@leanlog/data-access';
import { ApiError } from '../api';
import { IngredientEntry } from '../components/IngredientEntry';
import { useToday } from '../hooks/useToday';
import { normalizeIngredientName, resolveDraftMicronutrients } from '../lib';
import { dayTotals } from '../selectors';
import { useStore } from '../state';
import type { UpsertIngredient } from '../types';
import {
  HeaderControls,
  PageLoadingState,
  renderRouterNavLink,
  TrackerErrorState,
} from './_shared';

// The section open for adding food inline, and the meal backing it. `created`
// marks a meal this open created, removed again if closed while still empty.
// `editId` opens the form straight into editing that food.
type AddTarget = {
  section: SimpleSectionKey;
  dayId: string;
  mealId: string;
  created: boolean;
  editId?: string;
};

const EMPTY_SECTIONS: SimpleSection[] = SIMPLE_SECTIONS.map((s) => ({
  key: s.key,
  label: s.label,
  entries: [],
  totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
}));

const round = (n: number) => Math.round(n);

// Writes from this page only ever target today, so a 409 (past day) means the
// page outlived midnight mid-edit — report it distinctly from other failures.
function reportWriteError(e: unknown) {
  const pastDay = e instanceof ApiError && e.status === 409;
  posthog.captureException(e, { context: pastDay ? 'simple_past_day_write' : 'simple_write' });
}

// Simple mode's one entry page (#102): today only — weight, totals, and the
// four fixed meal sections. Past days are never shown here (they're read-only
// in Stats), and the page rolls over at local midnight.
export default function SimpleEntryPage() {
  const today = useToday();
  const {
    days,
    loading,
    error,
    ensureSimpleDay,
    ensureSectionMeal,
    updateDayWeight,
    upsertIngredient,
    removeIngredient,
    removeMeal,
    addIngredientFromDatabase,
  } = useStore();
  const track = useAnalytics();
  // One section is open at a time; the one it replaced (or that was just
  // closed) stays mounted as `closing` until its collapse animation ends.
  const [active, setActive] = useState<AddTarget | null>(null);
  const [closing, setClosing] = useState<AddTarget | null>(null);
  const [savingWeight, setSavingWeight] = useState(false);
  // The section whose add-food open failed, so the card can say so rather
  // than the tap silently doing nothing.
  const [failedSection, setFailedSection] = useState<SimpleSectionKey | null>(null);

  if (loading) return <PageLoadingState label="Loading today…" />;
  if (error) return <TrackerErrorState message={error} />;

  const day = days.find((d) => d.date === today);
  const sections = day ? groupDayIntoSections(day) : EMPTY_SECTIONS;
  const totals = day ? dayTotals(day) : null;

  async function openSection(
    section: SimpleSectionKey,
    existingDay: DailyMealLog | undefined,
    editId?: string,
  ) {
    setFailedSection(null);
    // Already open — unless it's a stale open from before midnight.
    if (activeOpen && active?.section === section && !editId) return;
    try {
      const d = existingDay ?? (await ensureSimpleDay(today));
      const existed = findSectionMeal(d, section) != null;
      const meal = await ensureSectionMeal(d.id, section);
      const sameSection = activeOpen && active?.section === section;
      if (active && !sameSection) beginClose(active);
      setActive({
        section,
        dayId: d.id,
        mealId: meal.id,
        created: sameSection ? active.created : !existed,
        editId,
      });
    } catch (e) {
      setFailedSection(section);
      posthog.captureException(e, { context: 'simple_ensure_section_meal' });
    }
  }

  function beginClose(t: AddTarget) {
    // Only one collapse animates at a time; finish any earlier one now.
    if (closing) finishClose(closing);
    setClosing(t);
  }

  function finishClose(t: AddTarget) {
    const meal = days.find((d) => d.id === t.dayId)?.meals.find((m) => m.id === t.mealId);
    // Opening a section creates its meal; drop it again if nothing was added so
    // an abandoned tap leaves no empty meal behind.
    if (t.created && meal && meal.ingredients.length === 0) {
      removeMeal(t.dayId, t.mealId).catch((e: unknown) =>
        posthog.captureException(e, { context: 'simple_section_cleanup' }),
      );
    }
  }

  function done() {
    if (!active) return;
    beginClose(active);
    setActive(null);
  }

  function collapsed(section: SimpleSectionKey) {
    if (closing?.section !== section) return;
    finishClose(closing);
    setClosing(null);
  }

  // A section left open past midnight belongs to a now read-only day: hide it.
  const activeOpen = active != null && days.find((d) => d.id === active.dayId)?.date === today;

  function entryFor(t: AddTarget) {
    const meal = days.find((d) => d.id === t.dayId)?.meals.find((m) => m.id === t.mealId);
    if (!meal) return undefined;
    return (
      <IngredientEntry
        // Remount per edit target so the form starts on the right food.
        key={`${t.mealId}:${t.editId ?? 'new'}`}
        ingredients={meal.ingredients}
        initialEditing={meal.ingredients.find((i) => i.id === t.editId)}
        showList={false}
        analyticsContext="simple"
        showDatabaseCreate
        onSubmit={(draft, editingId) => {
          const next: UpsertIngredient = {
            ...draft,
            id: editingId ?? uuidv7(),
            mealId: t.mealId,
            name: normalizeIngredientName(draft.name),
            // Blank numeric fields submit as 0; the strict schema requires numbers.
            weight: draft.weight ?? 0,
            fat: draft.fat ?? 0,
            saturatedFat: draft.saturatedFat ?? 0,
            carbs: draft.carbs ?? 0,
            fiber: draft.fiber ?? 0,
            protein: draft.protein ?? 0,
            micronutrients: resolveDraftMicronutrients(draft.micronutrients),
          };
          upsertIngredient(t.dayId, t.mealId, next).catch(reportWriteError);
        }}
        onDelete={(id) => removeIngredient(t.dayId, t.mealId, id).catch(reportWriteError)}
        onAddFromDatabase={(databaseIngredientId, input) =>
          addIngredientFromDatabase(t.dayId, t.mealId, { databaseIngredientId, ...input })
        }
      />
    );
  }

  async function saveWeight(weightLbs: number) {
    setSavingWeight(true);
    try {
      const d = day ?? (await ensureSimpleDay(today));
      await updateDayWeight(d.id, weightLbs);
      track('simple.weight.saved', {});
    } catch (e) {
      posthog.captureException(e, { context: 'simple_ensure_today' });
    } finally {
      setSavingWeight(false);
    }
  }

  return (
    <SimpleEntryTemplate
      heading={{
        navLinks: SIMPLE_NAV_LINKS,
        renderNavLink: renderRouterNavLink,
        rightContent: <HeaderControls />,
      }}
      weightSection={
        <BodyTrackingCard
          // Remount per date so the editor draft resets at rollover.
          key={`weight-${today}`}
          variant="weightOnly"
          weightLbs={day?.weightLbs ?? null}
          savingWeight={savingWeight}
          onSaveWeight={(w) => void saveWeight(w)}
        />
      }
      totalsSection={
        <DailyTotalsCard
          calories={round(totals?.calories ?? 0)}
          adjustedCalories={totals?.adjustedCalories ?? 0}
          protein={round(totals?.protein ?? 0)}
          carbs={round(totals?.carbs ?? 0)}
          fat={round(totals?.fat ?? 0)}
          fiber={totals?.fiber ?? 0}
        />
      }
      sections={sections.map((s) => {
        const isOpen = activeOpen && active?.section === s.key;
        const shown = isOpen ? active : closing?.section === s.key ? closing : null;
        return (
          <MealSectionCard
            key={s.key}
            title={s.label}
            totals={s.totals}
            error={failedSection === s.key ? `Couldn't open ${s.label}. Try again.` : undefined}
            items={s.entries.map((e) => ({
              id: e.ingredient.id,
              name: e.ingredient.name,
              calories: e.ingredient.calories,
              protein: e.ingredient.protein,
              carbs: e.ingredient.carbs,
              fat: e.ingredient.fat,
              editable: e.editable,
            }))}
            onAdd={() => {
              track('simple.food.add_opened', { section: s.key });
              void openSection(s.key, day);
            }}
            expanded={isOpen}
            entry={shown ? entryFor(shown) : undefined}
            onDone={done}
            onCollapsed={() => collapsed(s.key)}
            onEdit={(ingredientId) => void openSection(s.key, day, ingredientId)}
            onDelete={(ingredientId) => {
              const entry = s.entries.find((e) => e.ingredient.id === ingredientId);
              if (!day || !entry) return;
              removeIngredient(day.id, entry.mealId, ingredientId).catch(reportWriteError);
              track('simple.ingredient.deleted', { section: s.key });
            }}
          />
        );
      })}
    />
  );
}
