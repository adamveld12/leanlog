import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { uuidv7 } from '@leanlog/data-access';
import {
  APP_NAV_LINKS,
  Button,
  MacroSummaryLine,
  MealEditTemplate,
  recipes,
  SectionCard,
  Input,
} from '@leanlog/ui';
import { normalizeIngredientName, resolveDraftMicronutrients } from '../lib';
import { IngredientEntry } from '../components/IngredientEntry';
import { planMealTotals } from '../selectors';
import { useStore } from '../state';
import type { UpsertPlanIngredient } from '../types';
import {
  HeaderControls,
  renderRouterNavLink,
  RouteErrorState,
  RouteLoadingState,
  useSavedSections,
} from './_shared';

type PlanRouteLoad = { planId: string; status: 'loading' | 'not_found' | 'error'; error: string };

export default function PlanMealEditPage() {
  const { planId, planMealId } = useParams();
  const nav = useNavigate();
  const {
    planDetails,
    ensurePlanLoaded,
    renamePlanMeal,
    removePlanMeal,
    upsertPlanIngredient,
    removePlanIngredient,
    addPlanIngredientFromDatabase,
  } = useStore();
  const plan = planDetails.find((p) => p.id === planId);
  const meal = plan?.meals.find((m) => m.id === planMealId);
  const [mealNameDraft, setMealNameDraft] = useState<{ mealId: string | null; name: string }>({
    mealId: meal?.id ?? null,
    name: meal?.name ?? '',
  });
  const mealName = mealNameDraft.mealId === meal?.id ? mealNameDraft.name : (meal?.name ?? '');
  const setMealName = (name: string) => setMealNameDraft({ mealId: meal?.id ?? null, name });
  const { saved, markDirty, markSaved } = useSavedSections();

  const [routeLoad, setRouteLoad] = useState<PlanRouteLoad>({
    planId: planId ?? '',
    status: 'loading',
    error: '',
  });
  const routeStatus = routeLoad.planId === planId ? routeLoad.status : 'loading';

  useEffect(() => {
    if (!planId || plan) return;
    let cancelled = false;
    void ensurePlanLoaded(planId).then((result) => {
      if (cancelled) return;
      if (result.status === 'found') return;
      setRouteLoad({
        planId,
        status: result.status,
        error: result.status === 'error' ? result.error : '',
      });
    });
    return () => {
      cancelled = true;
    };
  }, [planId, plan, ensurePlanLoaded]);

  if (!planId || routeStatus === 'not_found') return <Navigate to="/track/goals/plans" replace />;
  if (routeStatus === 'error') return <RouteErrorState message={routeLoad.error} />;
  if (!plan) return <RouteLoadingState title="Loading plan…" />;
  if (!meal) return <Navigate to={`/track/goals/plans/${plan.id}`} replace />;

  const totals = planMealTotals(meal);

  return (
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
        backHref: `/track/goals/plans/${plan.id}`,
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
              void renamePlanMeal(plan.id, meal.id, name);
              markSaved('mealName');
            }}
            onBlur={() => {
              void renamePlanMeal(plan.id, meal.id, normalizeIngredientName(mealName));
              markSaved('mealName');
            }}
          />
          <div className={recipes.stack.row}>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                void removePlanMeal(plan.id, meal.id);
                nav(`/track/goals/plans/${plan.id}`);
              }}
            >
              Remove from plan
            </Button>
          </div>
        </SectionCard>
      }
      ingredientSection={
        <IngredientEntry
          ingredients={meal.ingredients}
          analyticsContext="plan"
          showDatabaseCreate
          onSubmit={(draft, editingId) => {
            const id = editingId ?? uuidv7();
            const next: UpsertPlanIngredient = {
              ...draft,
              id,
              planMealId: meal.id,
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
            void upsertPlanIngredient(plan.id, meal.id, next);
          }}
          onDelete={(id) => void removePlanIngredient(plan.id, meal.id, id)}
          onAddFromDatabase={(dbId, input) =>
            addPlanIngredientFromDatabase(plan.id, meal.id, {
              databaseIngredientId: dbId,
              ...input,
            })
          }
        />
      }
    />
  );
}
