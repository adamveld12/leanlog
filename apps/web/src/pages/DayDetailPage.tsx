import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  APP_NAV_LINKS,
  BodyTrackingCard,
  Button,
  cn,
  DailyTotalsCard,
  DayDetailTemplate,
  ExtrasCard,
  HelperText,
  type ListSectionItem,
  MacroSummaryLine,
  recipes,
  Select,
} from '@leanlog/ui';
import { deriveDayPlan, dayMealStructure, uuidv7, type PlanSummary } from '@leanlog/data-access';
import { ExtraDatabaseSearch } from '../components/extras/ExtraDatabaseSearch';
import { DayProgressPhotos } from '../components/progress-photos/DayProgressPhotos';
import { isPastIso, prettyDate, todayIso } from '../lib';
import {
  dayTotals,
  mealTotals,
  selectLatestMeasurements,
  selectMeasurementsDue,
  selectWeightEntries,
} from '../selectors';
import { useStore } from '../state';
import {
  type ApplyPlanState,
  HeaderControls,
  renderRouterNavLink,
  RouteErrorState,
  RouteLoadingState,
  type RouteLoadState,
  useApplyPlanState,
} from './_shared';

export default function DayDetailPage() {
  const { dayId } = useParams();
  const nav = useNavigate();
  const {
    days,
    goals,
    plans,
    ensureDayLoaded,
    addMeal,
    removeMeal,
    logMeal,
    updateDayTargets,
    updateDayWeight,
    setDayProgressPhoto,
    applyPlanToDay,
    addExtra,
    addExtraFromDatabase,
    upsertIngredient,
    removeIngredient,
  } = useStore();
  const [savingWeight, setSavingWeight] = useState(false);
  const [savingMeasurements, setSavingMeasurements] = useState(false);
  const [applyPlanId, setApplyPlanId] = useState('');
  const [applyState, dispatchApply] = useApplyPlanState();
  const [routeLoad, setRouteLoad] = useState<RouteLoadState>({
    dayId: dayId ?? '',
    status: 'loading',
    error: '',
  });
  const day = days.find((d) => d.id === dayId);
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
  if (!day) return <RouteLoadingState title="Loading day…" />;
  const totals = dayTotals(day);
  const structure = dayMealStructure(day);
  // A day is template-backed when it has copied meals; only such days have a
  // fixed structure and per-meal logging. Ad-hoc days keep freeform meals.
  const isTemplateBacked = structure.kind === 'template';
  const isPast = isPastIso(day.date);
  // The day's singleton Extras bucket (#64) — undefined until the first item
  // is quick-added, lazily created by addExtra().
  const extrasMeal = day.meals.find((m) => m.origin === 'extra');
  // Structured meals for the list, one pass: the Extras bucket lives in its
  // own section (R1), so it's dropped here rather than filtered separately.
  const mealsItems = day.meals.reduce<ListSectionItem[]>((acc, m) => {
    if (m.origin === 'extra') return acc;
    const mTotals = mealTotals(m);
    const isTemplateMeal = m.origin === 'template';
    const canLog = isTemplateMeal && !m.logged && m.ingredients.length > 0 && !isPast;
    acc.push({
      id: m.id,
      title: m.name || 'Meal',
      meta: (
        <MacroSummaryLine
          calories={mTotals.calories}
          protein={mTotals.protein}
          carbs={mTotals.carbs}
          fat={mTotals.fat}
        />
      ),
      // Logged copied meals show a confirmation; unlogged ones read "Not logged".
      rightMetric: isTemplateMeal ? (
        <HelperText>{m.logged ? '✓ Logged' : 'Not logged'}</HelperText>
      ) : undefined,
      actions: canLog ? (
        <Button
          size="sm"
          className="min-w-[72px] shrink-0 px-3"
          onClick={(e) => {
            e.stopPropagation();
            void logMeal(day.id, m.id);
          }}
        >
          Log
        </Button>
      ) : undefined,
      onOpen: () => nav(`/track/day/${day.id}/meal/${m.id}`),
      // A logged copied meal is recorded history and cannot be deleted; an
      // unlogged one (a plan default the user doesn't want) can (#84 narrows
      // #41 R19). Ad-hoc meals can always be deleted, unless the day is in
      // the past (R22).
      onDelete:
        (isTemplateMeal && m.logged) || isPast ? undefined : () => void removeMeal(day.id, m.id),
      deleteLabel: 'Delete meal',
    });
    return acc;
  }, []);
  // Cadence is derived from all days: the complete measurement set standing on
  // this day feeds the collapsed summary (as-of the viewed date so a past day
  // shows what was current then), and "due" hard-blocks the current day when none
  // falls in the last 7 days. Past days are read-only, so they're never due (#68).
  const latestMeasurements = selectLatestMeasurements(days, day.date);
  const measurementsDue = isPast ? false : selectMeasurementsDue(days, todayIso());

  return (
    <DayDetailTemplate
      heading={{
        title: prettyDate(day.date),
        backHref: '/track',
        navLinks: APP_NAV_LINKS,
        renderNavLink: renderRouterNavLink,
        rightContent: <HeaderControls />,
      }}
      weightSection={
        // Shown on every day: editable on the current day, read-only on past days
        // (which the server day guard also enforces). Keyed per-day so editor
        // drafts reset on navigation.
        <BodyTrackingCard
          key={`bodytracking-${day.id}`}
          readOnly={isPast}
          weightLbs={day.weightLbs}
          savingWeight={savingWeight}
          onSaveWeight={(next) => {
            setSavingWeight(true);
            void updateDayWeight(day.id, next).finally(() => setSavingWeight(false));
          }}
          measurementsToday={{
            shoulderInches: day.shoulderInches,
            waistInches: day.waistInches,
            bicepInches: day.bicepInches,
            thighInches: day.thighInches,
          }}
          latestMeasurements={latestMeasurements}
          measurementsDue={measurementsDue}
          savingMeasurements={savingMeasurements}
          onSaveMeasurements={(patch) => {
            setSavingMeasurements(true);
            void updateDayTargets(day.id, patch).finally(() => setSavingMeasurements(false));
          }}
        />
      }
      photosSection={
        isPast ? undefined : (
          <DayProgressPhotos
            key={day.id}
            day={day}
            onChange={(pose, photoKey) => void setDayProgressPhoto(day.id, pose, photoKey)}
          />
        )
      }
      totalsSection={
        <DailyTotalsCard
          calories={totals.calories}
          calorieTarget={day.targetCalories}
          adjustedCalories={totals.adjustedCalories}
          fat={totals.fat}
          protein={totals.protein}
          carbs={totals.carbs}
          fiber={totals.fiber}
          macroTargets={{ fat: day.targetFat, carbs: day.targetCarbs, protein: day.targetProtein }}
          onUpdateTargets={
            isPast
              ? undefined
              : () => {
                  // Recompute from the covering goal + latest weight on/before
                  // this day (#56, R61).
                  const plan = deriveDayPlan(
                    day.date,
                    goals,
                    selectWeightEntries(days),
                    todayIso(),
                  );
                  if (!plan) return;
                  void updateDayTargets(day.id, {
                    targetCalories: plan.targetCalories,
                    targetFat: plan.targetFat,
                    targetCarbs: plan.targetCarbs,
                    targetProtein: plan.targetProtein,
                  });
                }
          }
        />
      }
      mealsTitle={`Meals ${structure.mealsTracked} / ${structure.mealsExpected}`}
      mealsEmptyText={isPast ? 'No meals were logged this day.' : 'No meals yet. Add one below.'}
      mealsItems={mealsItems}
      mealsControls={
        <DayMealsControls
          isPast={isPast}
          isTemplateBacked={isTemplateBacked}
          plans={plans}
          applyPlanId={applyPlanId}
          onApplyPlanIdChange={setApplyPlanId}
          applyState={applyState}
          onApplyPlan={async () => {
            dispatchApply({ type: 'start' });
            try {
              const result = await applyPlanToDay(day.id, applyPlanId);
              dispatchApply({ type: 'succeeded', ...result });
              setApplyPlanId('');
            } finally {
              dispatchApply({ type: 'settled' });
            }
          }}
          onAddMeal={async () => {
            const meal = await addMeal(day.id, '');
            if (meal) nav(`/track/day/${day.id}/meal/${meal.id}`);
          }}
        />
      }
    >
      <ExtrasCard
        items={(extrasMeal?.ingredients ?? []).map((i) => ({
          id: i.id,
          name: i.name,
          calories: i.calories,
          protein: i.protein,
          carbs: i.carbs,
          fat: i.fat,
        }))}
        readOnly={isPast}
        onAdd={(draft) =>
          void addExtra(day.id, {
            id: uuidv7(),
            name: draft.name,
            calories: draft.calories,
            fat: draft.fat,
            carbs: draft.carbs,
            protein: draft.protein,
          })
        }
        onEdit={(id, draft) => {
          if (!extrasMeal) return;
          const existing = extrasMeal.ingredients.find((i) => i.id === id);
          if (!existing) return;
          // upsert overwrites every column, so patch the stored row rather than
          // rebuilding it — otherwise editing a database-sourced extra would
          // wipe its weight, fiber, micronutrients and source reference (#93
          // R14). The quick-add form only owns these five fields.
          void upsertIngredient(day.id, extrasMeal.id, {
            ...existing,
            mealId: extrasMeal.id,
            name: draft.name,
            calories: draft.calories,
            fat: draft.fat ?? 0,
            carbs: draft.carbs ?? 0,
            protein: draft.protein ?? 0,
          });
        }}
        onDelete={(id) => {
          if (!extrasMeal) return;
          void removeIngredient(day.id, extrasMeal.id, id);
        }}
        // Past days are read-only, so no lookup is offered there (#93 R12).
        // A fresh element each render is fine here: the panel keeps its own
        // reducer state across re-renders, and this render path sits after
        // early returns, so useMemo would break hook ordering.
        // react-doctor-disable-next-line react-doctor/jsx-no-jsx-as-prop
        databaseSearch={
          isPast ? undefined : (
            <ExtraDatabaseSearch
              surface="day"
              onAdd={async (databaseIngredientId, input) => {
                await addExtraFromDatabase(day.id, { databaseIngredientId, ...input });
              }}
            />
          )
        }
      />
    </DayDetailTemplate>
  );
}

type DayMealsControlsProps = {
  isPast: boolean;
  isTemplateBacked: boolean;
  plans: PlanSummary[];
  applyPlanId: string;
  onApplyPlanIdChange: (planId: string) => void;
  applyState: ApplyPlanState;
  onApplyPlan: () => Promise<void>;
  onAddMeal: () => Promise<void>;
};

// Below the meals list: apply a plan to fill matching meals, and add an
// ad-hoc meal (only on zero-template days, R34/R36). Hidden on past days.
function DayMealsControls({
  isPast,
  isTemplateBacked,
  plans,
  applyPlanId,
  onApplyPlanIdChange,
  applyState,
  onApplyPlan,
  onAddMeal,
}: DayMealsControlsProps) {
  if (isPast) return null;
  return (
    <div className={cn(recipes.stack.sm, 'mb-5')}>
      {plans.length > 0 ? (
        <div className={recipes.stack.sm}>
          <Select value={applyPlanId} onChange={(e) => onApplyPlanIdChange(e.target.value)}>
            <option value="">Apply a plan…</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Button
            className="w-full"
            variant="secondary"
            disabled={!applyPlanId || applyState.applying}
            onClick={() => void onApplyPlan()}
          >
            Apply plan
          </Button>
          {applyState.result ? (
            <HelperText>
              Filled {applyState.result.filled} meal
              {applyState.result.filled === 1 ? '' : 's'}, skipped {applyState.result.skipped} that
              already had food.
            </HelperText>
          ) : null}
        </div>
      ) : null}
      {!isTemplateBacked ? (
        <Button className="w-full" onClick={() => void onAddMeal()}>
          Add meal
        </Button>
      ) : null}
    </div>
  );
}
