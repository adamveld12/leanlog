import { useState } from 'react';
import posthog from 'posthog-js';
import {
  BodyTrackingCard,
  Button,
  DailyTotalsCard,
  MealSectionCard,
  Modal,
  recipes,
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

// The add-food dialog's target: which section, and the meal backing it.
// `created` marks a meal this dialog created, removed again if left empty.
type AddTarget = { section: SimpleSectionKey; dayId: string; mealId: string; created: boolean };

const EMPTY_SECTIONS: SimpleSection[] = SIMPLE_SECTIONS.map((s) => ({
  key: s.key,
  label: s.label,
  entries: [],
  totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
}));

const round = (n: number) => Math.round(n);

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
  const [target, setTarget] = useState<AddTarget | null>(null);
  const [savingWeight, setSavingWeight] = useState(false);

  if (loading) return <PageLoadingState label="Loading today…" />;
  if (error) return <TrackerErrorState message={error} />;

  const day = days.find((d) => d.date === today);
  const sections = day ? groupDayIntoSections(day) : EMPTY_SECTIONS;
  const totals = day ? dayTotals(day) : null;

  async function openSection(section: SimpleSectionKey, existingDay: DailyMealLog | undefined) {
    try {
      const d = existingDay ?? (await ensureSimpleDay(today));
      const existed = findSectionMeal(d, section) != null;
      const meal = await ensureSectionMeal(d.id, section);
      setTarget({ section, dayId: d.id, mealId: meal.id, created: !existed });
    } catch (e) {
      posthog.captureException(e, { context: 'simple_ensure_section_meal' });
    }
  }

  function closeSection() {
    if (!target) return;
    setTarget(null);
    const meal = days.find((d) => d.id === target.dayId)?.meals.find((m) => m.id === target.mealId);
    // Opening a section creates its meal; drop it again if nothing was added so
    // an abandoned tap leaves no empty meal behind.
    if (target.created && meal && meal.ingredients.length === 0) {
      removeMeal(target.dayId, target.mealId).catch((e: unknown) =>
        posthog.captureException(e, { context: 'simple_section_cleanup' }),
      );
    }
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

  const targetMeal = target
    ? days.find((d) => d.id === target.dayId)?.meals.find((m) => m.id === target.mealId)
    : undefined;
  const targetLabel = SIMPLE_SECTIONS.find((s) => s.key === target?.section)?.label ?? '';

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
      sections={sections.map((s) => (
        <MealSectionCard
          key={s.key}
          title={s.label}
          totals={s.totals}
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
          onEdit={() => void openSection(s.key, day)}
          onDelete={(ingredientId) => {
            const entry = s.entries.find((e) => e.ingredient.id === ingredientId);
            if (!day || !entry) return;
            void removeIngredient(day.id, entry.mealId, ingredientId);
            track('simple.ingredient.deleted', { section: s.key });
          }}
        />
      ))}
    >
      <Modal open={target != null} title={`Add to ${targetLabel}`} onClose={closeSection}>
        {target && targetMeal ? (
          <div className={recipes.stack.lg}>
            <IngredientEntry
              key={target.mealId}
              ingredients={targetMeal.ingredients}
              analyticsContext="simple"
              showDatabaseCreate
              onSubmit={(draft, editingId) => {
                const next: UpsertIngredient = {
                  ...draft,
                  id: editingId ?? uuidv7(),
                  mealId: target.mealId,
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
                void upsertIngredient(target.dayId, target.mealId, next);
              }}
              onDelete={(id) => void removeIngredient(target.dayId, target.mealId, id)}
              onAddFromDatabase={(databaseIngredientId, input) =>
                addIngredientFromDatabase(target.dayId, target.mealId, {
                  databaseIngredientId,
                  ...input,
                })
              }
            />
            <Button fullWidth onClick={closeSection}>
              Done
            </Button>
          </div>
        ) : null}
      </Modal>
    </SimpleEntryTemplate>
  );
}
