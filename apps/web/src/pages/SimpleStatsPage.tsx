import { useEffect } from 'react';
import {
  MealSectionCard,
  recipes,
  SIMPLE_NAV_LINKS,
  SimpleStatsTemplate,
  useAnalytics,
  WeekDayTotalsCard,
  type WeekDayRow,
} from '@leanlog/ui';
import { groupDayIntoSections, lastNDays, weekAverage } from '@leanlog/data-access';
import { useToday } from '../hooks/useToday';
import { prettyDate } from '../lib';
import { dayTotals } from '../selectors';
import { useStore } from '../state';
import {
  HeaderControls,
  PageLoadingState,
  renderRouterNavLink,
  TrackerErrorState,
} from './_shared';

const WINDOW_DAYS = 7;

// Simple mode's read-only look back at the last 7 days (#102). Newest first,
// per-day average over all 7 days (an unlogged day counts as zero).
export default function SimpleStatsPage() {
  const today = useToday();
  const { days, loading, error } = useStore();
  const track = useAnalytics();

  useEffect(() => {
    track('simple.stats.viewed', {});
  }, [track]);

  if (loading) return <PageLoadingState label="Loading your week…" />;
  if (error) return <TrackerErrorState message={error} />;

  const window = lastNDays(days, today, WINDOW_DAYS);
  const rows: WeekDayRow[] = window
    .map(({ date, day }): WeekDayRow => {
      const totals = day ? dayTotals(day) : null;
      const sections = day ? groupDayIntoSections(day).filter((s) => s.entries.length > 0) : [];
      const logged = day != null && (sections.length > 0 || day.weightLbs != null);
      return {
        key: date,
        label: prettyDate(date),
        logged,
        calories: totals?.calories ?? 0,
        protein: totals?.protein ?? 0,
        carbs: totals?.carbs ?? 0,
        fat: totals?.fat ?? 0,
        weightLbs: day?.weightLbs ?? null,
        details: logged ? (
          <div className={recipes.stack.sm}>
            {sections.map((s) => (
              <MealSectionCard
                key={s.key}
                title={s.label}
                totals={s.totals}
                readOnly
                items={s.entries.map((e) => ({
                  id: e.ingredient.id,
                  name: e.ingredient.name,
                  calories: e.ingredient.calories,
                  protein: e.ingredient.protein,
                  carbs: e.ingredient.carbs,
                  fat: e.ingredient.fat,
                  editable: false,
                }))}
              />
            ))}
          </div>
        ) : undefined,
      };
    })
    .reverse();

  const average = weekAverage(
    rows.map((r) => ({ calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fat })),
    WINDOW_DAYS,
  );

  return (
    <SimpleStatsTemplate
      heading={{
        navLinks: SIMPLE_NAV_LINKS,
        renderNavLink: renderRouterNavLink,
        rightContent: <HeaderControls />,
      }}
      weekSection={
        <WeekDayTotalsCard
          average={average}
          rows={rows}
          onExpand={(date) =>
            track('simple.stats.day_expanded', {
              daysAgo: window.length - 1 - window.findIndex((w) => w.date === date),
            })
          }
        />
      }
    />
  );
}
