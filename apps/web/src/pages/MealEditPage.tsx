import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { uuidv7 } from '@leanlog/data-access';
import {
  AnalyticsScope,
  APP_NAV_LINKS,
  Button,
  HelperText,
  Input,
  ListRow,
  MacroSummaryLine,
  MealEditTemplate,
  recipes,
  SectionCard,
  Text,
} from '@leanlog/ui';
import { resolveScannedMicronutrients, type NutritionUnit } from '@leanlog/data-access';
import { isPastIso, normalizeIngredientName } from '../lib';
import { IngredientEntry } from '../components/IngredientEntry';
import { mealTotals } from '../selectors';
import { useStore } from '../state';
import type { UpsertIngredient } from '../types';
import {
  HeaderControls,
  renderRouterNavLink,
  RouteErrorState,
  RouteLoadingState,
  type RouteLoadState,
  useSavedSections,
} from './_shared';

// Resolve the manual-entry micronutrient rows (which may carry a %DV) into typed
// amounts: a measured amount wins; otherwise the %DV is converted via the Daily
// Value table. Empty / unknown-with-only-%DV rows are dropped.
function resolveDraftMicronutrients(
  micros:
    | { name: string; amount?: number | null; unit?: string; percentDailyValue?: number | null }[]
    | null
    | undefined,
) {
  return resolveScannedMicronutrients(
    micros?.map((m) => ({
      name: m.name,
      amount: m.amount ?? undefined,
      unit: (m.unit as NutritionUnit | undefined) ?? undefined,
      percentDailyValue: m.percentDailyValue ?? undefined,
    })),
  );
}

export default function MealEditPage() {
  const { dayId, mealId } = useParams();
  const nav = useNavigate();
  const {
    days,
    ensureDayLoaded,
    renameMeal,
    removeMeal,
    upsertIngredient,
    removeIngredient,
    addIngredientFromDatabase,
  } = useStore();
  const day = days.find((d) => d.id === dayId);
  const meal = day?.meals.find((m) => m.id === mealId);
  const [mealNameDraft, setMealNameDraft] = useState<{ mealId: string | null; name: string }>({
    mealId: meal?.id ?? null,
    name: meal?.name ?? '',
  });
  const mealName = mealNameDraft.mealId === meal?.id ? mealNameDraft.name : (meal?.name ?? '');
  const setMealName = (name: string) => setMealNameDraft({ mealId: meal?.id ?? null, name });
  const { saved, markDirty, markSaved } = useSavedSections();

  const [routeLoad, setRouteLoad] = useState<RouteLoadState>({
    dayId: dayId ?? '',
    status: 'loading',
    error: '',
  });
  const routeStatus = routeLoad.dayId === dayId ? routeLoad.status : 'loading';

  useEffect(() => {
    if (!dayId || day) return;

    let cancelled = false;
    void ensureDayLoaded(dayId).then((result) => {
      if (cancelled) return;
      if (result.status === 'found') return;
      setRouteLoad({
        dayId,
        status: result.status,
        error: result.status === 'error' ? result.error : '',
      });
    });

    return () => {
      cancelled = true;
    };
  }, [dayId, day, ensureDayLoaded]);

  if (!dayId || routeStatus === 'not_found') return <Navigate to="/track" replace />;
  if (routeStatus === 'error') return <RouteErrorState message={routeLoad.error} />;
  if (!day) return <RouteLoadingState title="Loading meal…" />;
  if (!meal) return <Navigate to={`/track/day/${day.id}`} replace />;

  // Past days are fully read-only: show the meal and its ingredients with no
  // editing, logging, or deletion affordances (R22).
  if (isPastIso(day.date)) {
    const readOnlyTotals = mealTotals(meal);
    return (
      <MealEditTemplate
        heading={{
          title: meal.name || 'Meal',
          subtitle: (
            <MacroSummaryLine
              calories={readOnlyTotals.calories}
              protein={readOnlyTotals.protein}
              carbs={readOnlyTotals.carbs}
              fat={readOnlyTotals.fat}
            />
          ),
          backHref: `/track/day/${day.id}`,
          navLinks: APP_NAV_LINKS,
          renderNavLink: renderRouterNavLink,
          rightContent: <HeaderControls />,
        }}
        mealSection={
          <SectionCard title="Meal name">
            <Text as="p" className="font-medium">
              {meal.name || 'Meal'}
            </Text>
            <HelperText as="p">This day is in the past and is read-only.</HelperText>
          </SectionCard>
        }
        ingredientSection={
          <SectionCard title="Ingredients">
            {meal.ingredients.length ? null : <HelperText as="p">No items</HelperText>}
            <div className={recipes.stack.sm}>
              {meal.ingredients.map((i) => (
                <ListRow
                  key={i.id}
                  title={i.name}
                  // react-doctor-disable-next-line react-doctor/jsx-no-jsx-as-prop
                  meta={
                    <MacroSummaryLine
                      calories={i.calories}
                      protein={i.protein}
                      carbs={i.carbs}
                      fat={i.fat}
                    />
                  }
                />
              ))}
            </div>
          </SectionCard>
        }
      />
    );
  }

  const totals = mealTotals(meal);

  return (
    <AnalyticsScope properties={{ dayId: day.id, mealId: meal.id }}>
      <MealEditTemplate
        heading={{
          title: meal.name || 'Meal',
          subtitle: (
            <MacroSummaryLine
              calories={totals.calories}
              protein={totals.protein}
              carbs={totals.carbs}
              fat={totals.fat}
            />
          ),
          backHref: `/track/day/${day.id}`,
          navLinks: APP_NAV_LINKS,
          renderNavLink: renderRouterNavLink,
          rightContent: <HeaderControls />,
        }}
        mealSection={
          <SectionCard title="Meal name" saved={saved.mealName}>
            <Input
              value={mealName}
              placeholder="Meal Name"
              onChange={(e) => {
                setMealName(e.target.value);
                markDirty('mealName');
              }}
              normalizeOnBlur={normalizeIngredientName}
              onNormalized={(name) => {
                setMealName(name);
                void renameMeal(day.id, meal.id, name);
                markSaved('mealName');
              }}
              onBlur={() => {
                void renameMeal(day.id, meal.id, normalizeIngredientName(mealName));
                markSaved('mealName');
              }}
            />
            <div className={recipes.stack.row}>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  void removeMeal(day.id, meal.id);
                  nav(`/track/day/${day.id}`);
                }}
              >
                Delete meal and all ingredients
              </Button>
            </div>
          </SectionCard>
        }
        ingredientSection={
          <IngredientEntry
            ingredients={meal.ingredients}
            analyticsContext="meal"
            showDatabaseCreate
            onSubmit={(draft, editingId) => {
              const id = editingId ?? uuidv7();
              const next: UpsertIngredient = {
                ...draft,
                id,
                mealId: meal.id,
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
              void upsertIngredient(day.id, meal.id, next);
            }}
            onDelete={(id) => void removeIngredient(day.id, meal.id, id)}
            onAddFromDatabase={(dbId, input) =>
              addIngredientFromDatabase(day.id, meal.id, {
                databaseIngredientId: dbId,
                ...input,
              })
            }
          />
        }
      />
    </AnalyticsScope>
  );
}
