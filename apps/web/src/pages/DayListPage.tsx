import { useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  APP_NAV_LINKS,
  DayListTemplate,
  MonthCalendarCard,
  QuickActionsCard,
  WeeklyStatsCard,
} from '@leanlog/ui';
import { resolveCoveringGoal, type GoalMode } from '@leanlog/data-access';
import { prettyDate, todayIso } from '../lib';
import {
  aggregateStats,
  dayTotals,
  daysLast90,
  daysThisWeek,
  selectNorthStar,
  selectWeeklyWeightDelta,
  todayLog,
  trackedDatesMap,
} from '../selectors';
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
  const { days, goals, profile, loading, error, addDay } = useStore();

  // A shortcut to the goal covering today, shown in Quick Actions (#56).
  const activeGoal = useMemo(() => {
    const goal = resolveCoveringGoal(todayIso(), goals);
    if (!goal) return undefined;
    if (goal.isBackground) {
      return { summary: '🎯 Maintenance — set a goal', onOpen: () => nav('/track/goals') };
    }
    const namePart = goal.name?.trim() ? `${goal.name.trim()} · ` : '';
    const endPart = goal.endDate ? `ends ${prettyDate(goal.endDate)}` : 'ongoing';
    const summary = `🎯 ${namePart}${GOAL_MODE_LABEL[goal.mode]} · ${endPart}`;
    // Deep-link to this specific goal on the Goals page.
    return { summary, onOpen: () => nav(`/track/goals?goal=${goal.id}`) };
  }, [goals, nav]);

  const today = useMemo(() => todayLog(days), [days]);
  const todayTotalsData = useMemo(() => (today ? dayTotals(today) : null), [today]);

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

  async function handleAction() {
    if (!profile) return;
    // Log a meal: open today's day (creating it from templates if it's missing).
    if (today) {
      nav(`/track/day/${today.id}`);
      return;
    }
    await createAndOpenDay(todayIso());
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
      quickActions={
        <QuickActionsCard
          hasToday={!!today}
          hasDays={hasDays}
          today={
            todayTotalsData && today
              ? {
                  calories: todayTotalsData.calories,
                  calorieTarget: today.targetCalories,
                  protein: todayTotalsData.protein,
                  proteinTarget: today.targetProtein,
                  carbs: todayTotalsData.carbs,
                  carbsTarget: today.targetCarbs,
                  fat: todayTotalsData.fat,
                  fatTarget: today.targetFat,
                  fiber: todayTotalsData.fiber,
                }
              : undefined
          }
          week={
            weekDays.length > 0
              ? {
                  calories: weeklyStats.totalCalories,
                  calorieTarget: weeklyStats.targetCalories,
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
          onAction={() => void handleAction()}
          activeGoal={activeGoal}
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
