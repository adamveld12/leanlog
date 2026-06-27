import { Suspense, lazy, useMemo, useState } from 'react';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { SectionCard } from '../molecules/SectionCard';
import { Tabs } from '../molecules/Tabs';
import { HelperText } from '../atoms/HelperText';
import { Text } from '../atoms/Text';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';
import { useChartTokens } from './chartTokens';

// chart.js + react-chartjs-2 are heavy; load them on demand in their own chunk rather than
// the initial bundle (react-doctor: prefer-dynamic-import). A chunk-load failure surfaces to
// the app-level AnalyticsErrorBoundary; the card keeps its fixed height so nothing shifts.
const WeightTrendChart = lazy(() => import('./WeightTrendChart'));

export type WeightEntry = { date: string; weightLbs: number };
export type WeightTrendRange = '7d' | '30d' | '90d' | 'all';
export type WeightTrendView = 'daily' | 'weekly';

// Re-exported so WeightTrendChart (and callers) keep importing the canvas-token
// type from here even though it now lives in the shared chartTokens module.
export type { Tokens } from './chartTokens';

export type WeightTrendCardProps = {
  entries: WeightEntry[];
  // De-noised weekly-average points (each dated at its Monday) for the
  // week-over-week view (R14). Optional; the view is empty when absent.
  weeklyEntries?: WeightEntry[];
  // The measured week-over-week delta headline (R10), computed by the caller from
  // the SAME weigh-ins as the Statistics card so the two never disagree (R13).
  // null when there aren't enough weigh-ins across the two 7-day windows (R12).
  weekOverWeekDeltaLbs?: number | null;
  goalWeightLbs: number | null;
  defaultRange?: WeightTrendRange;
  defaultView?: WeightTrendView;
  now?: Date;
};

const RANGE_DAYS: Record<Exclude<WeightTrendRange, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

const RANGE_TABS = [
  { key: '7d', label: '7d', panelId: 'weight-trend-7d-panel' },
  { key: '30d', label: '30d', panelId: 'weight-trend-30d-panel' },
  { key: '90d', label: '90d', panelId: 'weight-trend-90d-panel' },
  { key: 'all', label: 'All', panelId: 'weight-trend-all-panel' },
];

// View is a segmented control above the range tabs (which own the panel), so it
// carries no panelId of its own.
const VIEW_TABS = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Week over week' },
];

// Stable empty default so an absent weeklyEntries prop doesn't mint a new array
// each render (react-doctor: empty default prop breaks memo).
const NO_ENTRIES: WeightEntry[] = [];

const EMPTY_TEXT = 'Start logging your weight on the day page! Your progress will appear here';
const WEEKLY_EMPTY_TEXT =
  'Keep logging your weight — weekly averages appear here once you have entries';

// The measured week-over-week delta headline shown above the weekly chart (R10).
function WeekOverWeekHeadline({ deltaLbs }: { deltaLbs: number | null }) {
  if (deltaLbs == null) {
    return <HelperText as="p">Needs more weigh-ins to measure week over week.</HelperText>;
  }
  const sign = deltaLbs > 0 ? '+' : '';
  return (
    <Text as="p" variant="meta">
      Week over week:{' '}
      <Text as="span" variant="body" className="font-semibold">
        {`${sign}${deltaLbs.toFixed(1)} lb`}
      </Text>
    </Text>
  );
}

export function WeightTrendCard({
  entries,
  weeklyEntries = NO_ENTRIES,
  weekOverWeekDeltaLbs = null,
  goalWeightLbs,
  defaultRange = '30d',
  defaultView = 'daily',
  now,
}: WeightTrendCardProps) {
  const [view, setView] = useState<WeightTrendView>(defaultView);
  const [range, setRange] = useState<WeightTrendRange>(defaultRange);
  const tokens = useChartTokens();

  const source = view === 'weekly' ? weeklyEntries : entries;
  const filtered = useMemo(() => filterByRange(source, range, now), [source, range, now]);
  const isEmpty = filtered.length === 0;

  return (
    <AnalyticsScope properties={{ organism: 'WeightTrendCard' }}>
      <SectionCard title="Weight Trend">
        <Tabs
          tabs={VIEW_TABS}
          active={view}
          onChange={(key) => setView(key as WeightTrendView)}
          label="Weight trend view"
        />
        <Tabs
          tabs={RANGE_TABS}
          active={range}
          onChange={(key) => setRange(key as WeightTrendRange)}
          label="Weight trend range"
        />
        <div
          role="tabpanel"
          id={`weight-trend-${range}-panel`}
          aria-labelledby={`weight-trend-${range}-panel-tab`}
          className={recipes.stack.sm}
        >
          {view === 'weekly' ? <WeekOverWeekHeadline deltaLbs={weekOverWeekDeltaLbs} /> : null}
          <div className="relative h-56 w-full">
            <Suspense fallback={null}>
              <WeightTrendChart
                entries={filtered}
                goalWeightLbs={goalWeightLbs}
                tokens={tokens}
                ariaLabel={ariaLabelFor(view, range, filtered.length)}
              />
            </Suspense>
            {isEmpty ? (
              <div
                aria-live="polite"
                className={cn(
                  recipes.stack.centerFull,
                  'absolute inset-0 p-4',
                  recipes.surface.overlay,
                )}
              >
                <Text variant="meta">{view === 'weekly' ? WEEKLY_EMPTY_TEXT : EMPTY_TEXT}</Text>
              </div>
            ) : null}
          </div>
        </div>
      </SectionCard>
    </AnalyticsScope>
  );
}

function filterByRange(entries: WeightEntry[], range: WeightTrendRange, now?: Date): WeightEntry[] {
  if (range === 'all') return entries;
  const reference = now ?? new Date();
  const cutoff = new Date(reference);
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - RANGE_DAYS[range] + 1);
  const cutoffIso = toIso(cutoff);
  return entries.filter((e) => e.date >= cutoffIso);
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function ariaLabelFor(view: WeightTrendView, range: WeightTrendRange, count: number): string {
  const noun = view === 'weekly' ? 'Weekly-average weight trend chart' : 'Weight trend chart';
  if (count === 0) return `${noun}, no entries logged yet`;
  const window = range === 'all' ? 'all time' : `the last ${range}`;
  return `${noun} over ${window}, ${count} ${count === 1 ? 'entry' : 'entries'}`;
}
