import { useEffect, useMemo, useState } from 'react';
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
import { deriveDayPlan, type Plan } from '@leanlog/data-access';
import { isoToParts, normalizeIngredientName, partsToIso, todayIso } from '../lib';
import { planMealTotals, planTotals, selectWeightEntries } from '../selectors';
import { useStore } from '../state';
import {
  HeaderControls,
  renderRouterNavLink,
  RouteErrorState,
  RouteLoadingState,
  useApplyPlanState,
  useSavedSections,
} from './_shared';

type PlanRouteLoad = { planId: string; status: 'loading' | 'not_found' | 'error'; error: string };

export default function PlanEditPage() {
  const { planId } = useParams();
  const { planDetails, ensurePlanLoaded } = useStore();
  const plan = planDetails.find((p) => p.id === planId);

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

  return <PlanEditView plan={plan} />;
}

// Split out from PlanEditPage so `plan` is always defined here — no early
// return precedes this component's hooks, unlike the parent's route-loading
// guards.
function PlanEditView({ plan }: { plan: Plan }) {
  const nav = useNavigate();
  const {
    days,
    goals,
    renamePlan,
    duplicatePlan,
    addPlanMeal,
    reorderPlanMeals,
    addDay,
    applyPlanToDay,
  } = useStore();
  const { saved, markDirty, markSaved } = useSavedSections();

  const [nameDraft, setNameDraft] = useState<{ planId: string | null; name: string }>({
    planId: plan.id,
    name: plan.name,
  });
  const name = nameDraft.planId === plan.id ? nameDraft.name : plan.name;
  const setName = (next: string) => setNameDraft({ planId: plan.id, name: next });

  const [applyDate, setApplyDate] = useState(() => isoToParts(todayIso()));
  const [applyState, dispatchApply] = useApplyPlanState();

  const dangerZone = useMemo(
    () => <PlanDangerZone planId={plan.id} mealCount={plan.meals.length} />,
    [plan.id, plan.meals.length],
  );

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
              disabled={applyState.applying}
              onClick={async () => {
                dispatchApply({ type: 'start' });
                try {
                  const iso = partsToIso(applyDate);
                  let day = days.find((d) => d.date === iso);
                  let createdDay = false;
                  if (!day) {
                    day = await addDay(iso);
                    createdDay = true;
                  }
                  const result = await applyPlanToDay(day.id, plan.id);
                  dispatchApply({ type: 'succeeded', ...result });
                  posthog.capture('plan_applied', {
                    entry: 'plan_detail',
                    filled: result.filled,
                    skipped: result.skipped,
                    createdDay,
                  });
                } finally {
                  dispatchApply({ type: 'settled' });
                }
              }}
            >
              Apply to this date
            </Button>
            {applyState.result ? (
              <HelperText>
                Filled {applyState.result.filled} meal{applyState.result.filled === 1 ? '' : 's'},
                skipped {applyState.result.skipped} that already had food.
              </HelperText>
            ) : null}
          </div>
        </SectionCard>
      }
      totalsSection={
        <DailyTotalsCard
          calories={totals.calories}
          calorieTarget={targets?.targetCalories ?? 0}
          adjustedCalories={totals.adjustedCalories}
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
      dangerZone={dangerZone}
    />
  );
}

function PlanDangerZone({ planId, mealCount }: { planId: string; mealCount: number }) {
  const nav = useNavigate();
  const { removePlan } = useStore();
  return (
    <SectionCard title="Danger zone">
      <Button
        variant="danger"
        className="w-full"
        onClick={async () => {
          await removePlan(planId);
          posthog.capture('plan_deleted', { mealCount });
          nav('/track/goals/plans');
        }}
      >
        Delete plan
      </Button>
    </SectionCard>
  );
}
