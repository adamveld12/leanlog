import { useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import posthog from 'posthog-js';
import {
  APP_NAV_LINKS,
  DayListTemplate,
  MonthCalendarCard,
  QuickActionsCard,
  TodayObjectivesCard,
  useAnalytics,
  WeeklyStatsCard,
  type ExtraDraft,
} from '@leanlog/ui';
import { isMeaningfulMeal, resolveCoveringGoal, uuidv7, type GoalMode } from '@leanlog/data-access';
import { prettyDate, timeLabel, todayIso } from '../lib';
import {
  aggregateStats,
  daysLast90,
  daysThisWeek,
  selectNorthStar,
  selectTodayObjectives,
  selectWeeklyWeightDelta,
  todayLog,
  trackedDatesMap,
} from '../selectors';
import { ExtraDatabaseSearch } from '../components/extras/ExtraDatabaseSearch';
import { useStore } from '../state';
import {
  HeaderControls,
  PageLoadingState,
  renderRouterNavLink,
  TrackerErrorState,
} from './_shared';

const GOAL_MODE_LABEL: Record<GoalMode, string> = {
  cut: 'Cut',
  maintain: 'Maintain',
  lean_gain: 'Lean Gain',
};

export default function DayListPage() {
  const nav = useNavigate();
  const track = useAnalytics();
  const {
    days,
    goals,
    plans,
    profile,
    loading,
    error,
    addDay,
    addMeal,
    addExtra,
    addExtraFromDatabase,
  } = useStore();

  // A shortcut to the goal covering today, shown in Quick Actions (#56).
  const activeGoal = useMemo(() => {
    const goal = resolveCoveringGoal(todayIso(), goals);
    if (!goal) return undefined;
    if (goal.isBackground) {
      return { summary: 'GOAL: 🎯 Maintenance — set a goal', onOpen: () => nav('/track/goals') };
    }
    const namePart = goal.name?.trim() ? `${goal.name.trim()} · ` : '';
    const endPart = goal.endDate ? `ends ${prettyDate(goal.endDate)}` : 'ongoing';
    const summary = `GOAL: 🎯 ${namePart}${GOAL_MODE_LABEL[goal.mode]} · ${endPart}`;
    // Deep-link to this specific goal on the Goals page.
    return { summary, onOpen: () => nav(`/track/goals?goal=${goal.id}`) };
  }, [goals, nav]);

  const today = useMemo(() => todayLog(days), [days]);
  // Today only (#37 R2) — previewed from the covering goal until the day exists.
  const objectives = useMemo(() => selectTodayObjectives(days, goals, plans), [days, goals, plans]);

  const weekDays = useMemo(() => daysThisWeek(days), [days]);
  const weeklyStats = useMemo(() => aggregateStats(weekDays), [weekDays]);

  const last90Days = useMemo(() => daysLast90(days), [days]);
  const overallStats = useMemo(() => aggregateStats(last90Days), [last90Days]);

  const dateMap = useMemo(() => trackedDatesMap(days), [days]);
  // The measured week-over-week weight number headlines the Statistics card; the
  // trend charts themselves now live on the Stats page (#68).
  const weeklyWeightDelta = useMemo(() => selectWeeklyWeightDelta(days), [days]);
  const northStar = useMemo(() => selectNorthStar(days), [days]);
  const selectDay = useCallback((dayId: string) => nav(`/track/day/${dayId}`), [nav]);

  const hasDays = days.length > 0;
  const creatingRef = useRef(false);

  // Create a day for the given ISO date (copying templates) and open it. Shared
  // by the "Log a meal" quick action and the calendar's tap-to-create.
  const createAndOpenDay = useCallback(
    async (iso: string) => {
      if (creatingRef.current) return;
      creatingRef.current = true;
      try {
        // Targets + meal slots are derived from the covering goal inside addDay (#56).
        const day = await addDay(iso);
        nav(`/track/day/${day.id}`);
      } finally {
        creatingRef.current = false;
      }
    },
    [addDay, nav],
  );

  // Resolves today's day id without navigating, creating it from templates
  // first if it doesn't exist yet (#56) — used by actions that operate on
  // today in place, like the inline "Log an extra" control (#64 R9/R10).
  const ensureTodayId = useCallback(async () => {
    if (today) return today.id;
    if (creatingRef.current) return null;
    creatingRef.current = true;
    try {
      const day = await addDay(todayIso());
      return day.id;
    } finally {
      creatingRef.current = false;
    }
  }, [today, addDay]);

  async function handleAction() {
    if (!profile) return;
    // Open today's day (creating it from templates if it's missing). The Day page
    // leads with the weight editor until weight is logged.
    if (today) {
      nav(`/track/day/${today.id}`);
      return;
    }
    try {
      await createAndOpenDay(todayIso());
    } catch (e) {
      posthog.captureException(e, { context: 'day_objectives_weight_log' });
    }
  }

  // Next-meal CTA (#37 R13): continue the first meal that isn't yet meaningful,
  // else start a new one. A pre-filled plan meal is logged from the Day page —
  // the Log control isn't on the meal editor — so that is where it sends the user.
  // One guard spans the whole action, so a double-tap can't add two meals.
  async function handleNextMeal() {
    if (!profile || creatingRef.current) return;
    creatingRef.current = true;
    try {
      const day = today ?? (await addDay(todayIso()));
      const open = day.meals.find((m) => m.origin !== 'extra' && !isMeaningfulMeal(m));
      if (open?.origin === 'template' && open.ingredients.length > 0) {
        nav(`/track/day/${day.id}`);
        return;
      }
      const meal = open ?? (await addMeal(day.id, ''));
      nav(meal ? `/track/day/${day.id}/meal/${meal.id}` : `/track/day/${day.id}`);
    } catch (e) {
      posthog.captureException(e, { context: 'day_objectives_next_meal' });
    } finally {
      creatingRef.current = false;
    }
  }

  // Log an extra (#64 R9/R10): the Quick Actions card handles its own inline
  // form and only calls this on submit — no navigation, stays on Track.
  async function handleAddExtra(draft: ExtraDraft) {
    if (!profile) return;
    const dayId = await ensureTodayId();
    if (!dayId) return;
    await addExtra(dayId, {
      id: uuidv7(),
      name: draft.name,
      calories: draft.calories,
      fat: draft.fat,
      carbs: draft.carbs,
      protein: draft.protein,
    });
  }

  if (loading) return <PageLoadingState label="Loading your days…" />;
  if (error) return <TrackerErrorState message={error} />;

  return (
    <DayListTemplate
      heading={{
        title: 'leanlog',
        navLinks: APP_NAV_LINKS,
        renderNavLink: renderRouterNavLink,
        rightContent: <HeaderControls />,
      }}
      // react-doctor-disable-next-line react-doctor/jsx-no-jsx-as-prop
      objectives={
        <TodayObjectivesCard
          weight={{
            ...objectives.weight,
            onLogWeight: () => {
              track('day.objectives.cta.clicked', { objective: 'weight', dayDate: todayIso() });
              void handleAction();
            },
          }}
          meals={{
            ...objectives.meals,
            onNextMeal: () => {
              track('day.objectives.cta.clicked', { objective: 'meal', dayDate: todayIso() });
              void handleNextMeal();
            },
          }}
          macros={objectives.macros}
          allComplete={objectives.allComplete}
          completedAtLabel={
            today?.objectivesCompletedAt ? timeLabel(today.objectivesCompletedAt) : undefined
          }
        />
      }
      quickActions={
        <QuickActionsCard
          hasDays={hasDays}
          week={
            weekDays.length > 0
              ? {
                  calories: weeklyStats.totalCalories,
                  calorieTarget: weeklyStats.targetCalories,
                  adjustedCalories: weeklyStats.adjustedCalories,
                  protein: weeklyStats.totalProtein,
                  proteinTarget: weeklyStats.targetProtein,
                  carbs: weeklyStats.totalCarbs,
                  carbsTarget: weeklyStats.targetCarbs,
                  fat: weeklyStats.totalFat,
                  fatTarget: weeklyStats.targetFat,
                  fiber: weeklyStats.totalFiber,
                }
              : undefined
          }
          weekDayCount={weekDays.length}
          activeGoal={activeGoal}
          onOpenPlans={() => nav('/track/goals/plans')}
          onAddExtra={(draft) => void handleAddExtra(draft)}
          // Same as DayDetailPage: the panel owns its reducer state, so a new
          // element per render re-renders it rather than resetting it.
          // react-doctor-disable-next-line react-doctor/jsx-no-jsx-as-prop
          extraDatabaseSearch={
            <ExtraDatabaseSearch
              surface="track"
              onAdd={async (databaseIngredientId, input) => {
                // Same as handleAddExtra: resolve (creating) today first, so a
                // lookup works before today's day exists (#64 R10, #93 R10).
                if (!profile) return;
                const dayId = await ensureTodayId();
                if (!dayId) return;
                await addExtraFromDatabase(dayId, { databaseIngredientId, ...input });
              }}
            />
          }
        />
      }
      // react-doctor-disable-next-line react-doctor/jsx-no-jsx-as-prop
      statistics={
        <WeeklyStatsCard
          weekly={{
            accuracyOverall: weeklyStats.accuracy.overall,
            accuracyCalories: weeklyStats.accuracy.calories,
            accuracyProtein: weeklyStats.accuracy.protein,
            accuracyCarbs: weeklyStats.accuracy.carbs,
            accuracyFat: weeklyStats.accuracy.fat,
            coverage: weeklyStats.coverage,
            mealsTracked: weeklyStats.mealsTracked,
            mealsExpected: weeklyStats.mealsExpected,
          }}
          overall={{
            accuracyOverall: overallStats.accuracy.overall,
            accuracyCalories: overallStats.accuracy.calories,
            accuracyProtein: overallStats.accuracy.protein,
            accuracyCarbs: overallStats.accuracy.carbs,
            accuracyFat: overallStats.accuracy.fat,
            coverage: overallStats.coverage,
            mealsTracked: overallStats.mealsTracked,
            mealsExpected: overallStats.mealsExpected,
          }}
          hasWeeklyData={weekDays.length > 0}
          hasOverallData={last90Days.length > 0}
          northStar={northStar}
          weeklyWeightChangeLbs={weeklyWeightDelta?.deltaLbs ?? null}
        />
      }
      // react-doctor-disable-next-line react-doctor/jsx-no-jsx-as-prop
      calendar={
        <MonthCalendarCard
          trackedDates={dateMap}
          onSelectDay={selectDay}
          onCreateDay={(iso) => void createAndOpenDay(iso)}
          emptyHint={!hasDays ? 'Start logging to fill in your calendar!' : undefined}
        />
      }
    />
  );
}
