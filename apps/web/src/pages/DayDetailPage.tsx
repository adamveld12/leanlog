import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  APP_NAV_LINKS,
  BodyTrackingCard,
  Button,
  cn,
  DailyTotalsCard,
  DayDetailTemplate,
  HelperText,
  MacroSummaryLine,
  recipes,
} from '@leanlog/ui';
import { deriveDayPlan, dayMealStructure } from '@leanlog/data-access';
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
  HeaderControls,
  renderRouterNavLink,
  RouteErrorState,
  RouteLoadingState,
  type RouteLoadState,
} from './_shared';

export default function DayDetailPage() {
  const { dayId } = useParams();
  const nav = useNavigate();
  const {
    days,
    goals,
    ensureDayLoaded,
    addMeal,
    removeMeal,
    logMeal,
    updateDayTargets,
    updateDayWeight,
  } = useStore();
  const [savingWeight, setSavingWeight] = useState(false);
  const [savingMeasurements, setSavingMeasurements] = useState(false);
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
      totalsSection={
        <DailyTotalsCard
          calories={totals.calories}
          calorieTarget={day.targetCalories}
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
      mealsItems={day.meals.map((m) => {
        const mTotals = mealTotals(m);
        const isTemplateMeal = m.origin === 'template';
        const canLog = isTemplateMeal && !m.logged && m.ingredients.length > 0 && !isPast;
        return {
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
          // Copied template meals cannot be deleted (R19); ad-hoc meals can,
          // unless the day is in the past (R22).
          onDelete: isTemplateMeal || isPast ? undefined : () => void removeMeal(day.id, m.id),
          deleteLabel: 'Delete meal',
        };
      })}
      mealsControls={
        // Ad-hoc meals can only be added to zero-template days, and never to a
        // past day (R34/R36/R22).
        isTemplateBacked || isPast ? undefined : (
          <div className={cn(recipes.stack.sm, 'mb-5')}>
            <Button
              className="w-full"
              onClick={async () => {
                const meal = await addMeal(day.id, '');
                if (meal) nav(`/track/day/${day.id}/meal/${meal.id}`);
              }}
            >
              Add meal
            </Button>
          </div>
        )
      }
    />
  );
}
