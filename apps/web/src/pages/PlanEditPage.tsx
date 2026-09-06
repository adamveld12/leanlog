import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import posthog from 'posthog-js';
import {
  APP_NAV_LINKS,
  Button,
  DailyTotalsCard,
  DateSelect3,
  HelperText,
  Input,
  PlanEditTemplate,
  recipes,
  ReorderableList,
  SectionCard,
} from '@leanlog/ui';
import { deriveDayPlan } from '@leanlog/data-access';
import { isoToParts, normalizeIngredientName, partsToIso, todayIso } from '../lib';
import { planMealTotals, planTotals, selectWeightEntries } from '../selectors';
import { useStore } from '../state';
import {
  HeaderControls,
  renderRouterNavLink,
  RouteErrorState,
  RouteLoadingState,
  useSavedSections,
} from './_shared';

type PlanRouteLoad = { planId: string; status: 'loading' | 'not_found' | 'error'; error: string };

export default function PlanEditPage() {
  const { planId } = useParams();
  const nav = useNavigate();
  const {
    days,
    goals,
    planDetails,
    ensurePlanLoaded,
    renamePlan,
    duplicatePlan,
    removePlan,
    addPlanMeal,
    reorderPlanMeals,
    addDay,
    applyPlanToDay,
  } = useStore();
  const plan = planDetails.find((p) => p.id === planId);
  const { saved, markDirty, markSaved } = useSavedSections();

  const [nameDraft, setNameDraft] = useState<{ planId: string | null; name: string }>({
    planId: plan?.id ?? null,
    name: plan?.name ?? '',
  });
  const name = nameDraft.planId === plan?.id ? nameDraft.name : (plan?.name ?? '');
  const setName = (next: string) => setNameDraft({ planId: plan?.id ?? null, name: next });

  const [applyDate, setApplyDate] = useState(() => isoToParts(todayIso()));
  const [applyResult, setApplyResult] = useState<{ filled: number; skipped: number } | null>(null);
  const [applying, setApplying] = useState(false);

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

  const totals = planTotals(plan);
  const targetDate = todayIso();
  const targets = deriveDayPlan(targetDate, goals, selectWeightEntries(days), targetDate);

  return (
    <PlanEditTemplate
      heading={{
        title: plan.name,
        backHref: '/track/goals/plans',
        navLinks: APP_NAV_LINKS,
        renderNavLink: renderRouterNavLink,
        rightContent: <HeaderControls />,
      }}
      nameSection={
        <SectionCard title="Plan name" saved={saved.planName}>
          <Input
            value={name}
            placeholder="Plan name"
            onChange={(e) => {
              setName(e.target.value);
              markDirty('planName');
            }}
            normalizeOnBlur={normalizeIngredientName}
            onNormalized={(next) => {
              setName(next);
              void renamePlan(plan.id, next);
              markSaved('planName');
            }}
            onBlur={() => {
              void renamePlan(plan.id, normalizeIngredientName(name));
              markSaved('planName');
            }}
          />
          <div className={recipes.stack.row}>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={async () => {
                const copy = await duplicatePlan(plan.id);
                posthog.capture('plan_duplicated', { mealCount: copy.meals.length });
                nav(`/track/goals/plans/${copy.id}`);
              }}
            >
              Duplicate
            </Button>
          </div>
          <div className={recipes.stack.sm}>
            <HelperText as="p">Apply to a date</HelperText>
            <DateSelect3 {...applyDate} onChange={setApplyDate} />
            <Button
              className="w-full"
              disabled={applying}
              onClick={async () => {
                setApplying(true);
                try {
                  const iso = partsToIso(applyDate);
                  let day = days.find((d) => d.date === iso);
                  let createdDay = false;
                  if (!day) {
                    day = await addDay(iso);
                    createdDay = true;
                  }
                  const result = await applyPlanToDay(day.id, plan.id);
                  setApplyResult(result);
                  posthog.capture('plan_applied', {
                    entry: 'plan_detail',
                    filled: result.filled,
                    skipped: result.skipped,
                    createdDay,
                  });
                } finally {
                  setApplying(false);
                }
              }}
            >
              Apply to this date
            </Button>
            {applyResult ? (
              <HelperText>
                Filled {applyResult.filled} meal{applyResult.filled === 1 ? '' : 's'}, skipped{' '}
                {applyResult.skipped} that already had food.
              </HelperText>
            ) : null}
          </div>
        </SectionCard>
      }
      totalsSection={
        <DailyTotalsCard
          calories={totals.calories}
          calorieTarget={targets?.targetCalories ?? 0}
          fat={totals.fat}
          protein={totals.protein}
          carbs={totals.carbs}
          fiber={totals.fiber}
          macroTargets={{
            fat: targets?.targetFat ?? 0,
            carbs: targets?.targetCarbs ?? 0,
            protein: targets?.targetProtein ?? 0,
          }}
        />
      }
      mealsSection={
        <SectionCard title="Meals">
          {plan.meals.length === 0 ? (
            <HelperText as="p">No meals yet. Add one below.</HelperText>
          ) : (
            <ReorderableList
              items={plan.meals.map((m) => {
                const mTotals = planMealTotals(m);
                return {
                  id: m.id,
                  title: m.name,
                  meta: (
                    <HelperText>
                      {mTotals.calories} kcal · {mTotals.protein}p · {mTotals.carbs}c ·{' '}
                      {mTotals.fat}f
                    </HelperText>
                  ),
                  onOpen: () => nav(`/track/goals/plans/${plan.id}/meal/${m.id}`),
                };
              })}
              onReorder={(orderedIds) => void reorderPlanMeals(plan.id, orderedIds)}
            />
          )}
          <Button
            className="w-full"
            variant="secondary"
            onClick={async () => {
              const meal = await addPlanMeal(plan.id, `Meal ${plan.meals.length + 1}`);
              if (meal) nav(`/track/goals/plans/${plan.id}/meal/${meal.id}`);
            }}
          >
            Add meal
          </Button>
        </SectionCard>
      }
      dangerZone={
        <SectionCard title="Danger zone">
          <Button
            variant="danger"
            className="w-full"
            onClick={async () => {
              await removePlan(plan.id);
              posthog.capture('plan_deleted', { mealCount: plan.meals.length });
              nav('/track/goals/plans');
            }}
          >
            Delete plan
          </Button>
        </SectionCard>
      }
    />
  );
}
