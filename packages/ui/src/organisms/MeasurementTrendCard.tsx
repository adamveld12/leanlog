import { Suspense, lazy, useMemo, useState } from 'react';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { SectionCard } from '../molecules/SectionCard';
import { Tabs } from '../molecules/Tabs';
import { Text } from '../atoms/Text';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';
import { useChartTokens } from './chartTokens';

// chart.js + react-chartjs-2 are heavy; load them on demand in their own chunk (shared with the
// weight chart) rather than the initial bundle. A chunk-load failure surfaces to the app-level
// AnalyticsErrorBoundary; the card keeps its fixed height so nothing shifts.
const MeasurementTrendChart = lazy(() => import('./MeasurementTrendChart'));

export type MeasurementTrendEntry = { date: string; value: number };
export type MeasurementTrendRange = '7d' | '30d' | '90d' | 'all';
export type MeasurementMetric = 'vtaper' | 'shoulder' | 'waist' | 'bicep' | 'thigh';

export type MeasurementTrendCardProps = {
  // The card heading + which metric tabs to show (in order). The card is generic so
  // the Stats page can mount it more than once with different metric groupings (#68).
  title: string;
  metrics: MeasurementMetric[];
  // Per-day points keyed by metric; a metric with no entries shows its empty prompt.
  entries: Partial<Record<MeasurementMetric, MeasurementTrendEntry[]>>;
  defaultRange?: MeasurementTrendRange;
  now?: Date;
};

const RANGE_DAYS: Record<Exclude<MeasurementTrendRange, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

// Range tabs are a segmented filter on top of the metric tabpanel, so they carry
// no panelId of their own (the metric tabs own the panel).
const RANGE_TABS = [
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: 'all', label: 'All' },
];

const METRIC_CONFIG: Record<
  MeasurementMetric,
  { label: string; unit: string; precision: number; minPad: number; noun: string; empty: string }
> = {
  vtaper: {
    label: 'V-Taper',
    unit: '',
    precision: 2,
    minPad: 0.05,
    noun: 'v-taper',
    empty: 'Log shoulder and waist on the day page to chart your v-taper over time.',
  },
  shoulder: {
    label: 'Shoulder',
    unit: 'in',
    precision: 1,
    minPad: 1,
    noun: 'shoulder',
    empty: 'Log your shoulders on the day page to chart them over time.',
  },
  waist: {
    label: 'Waist',
    unit: 'in',
    precision: 1,
    minPad: 1,
    noun: 'waist',
    empty: 'Log your waist on the day page to chart it over time.',
  },
  bicep: {
    label: 'Bicep',
    unit: 'in',
    precision: 1,
    minPad: 1,
    noun: 'bicep',
    empty: 'Log your biceps on the day page to chart them over time.',
  },
  thigh: {
    label: 'Quad',
    unit: 'in',
    precision: 1,
    minPad: 1,
    noun: 'quad',
    empty: 'Log your quads on the day page to chart them over time.',
  },
};

const NO_ENTRIES: MeasurementTrendEntry[] = [];

export function MeasurementTrendCard({
  title,
  metrics,
  entries,
  defaultRange = '30d',
  now,
}: MeasurementTrendCardProps) {
  const [metric, setMetric] = useState<MeasurementMetric>(() => metrics[0]);
  const [range, setRange] = useState<MeasurementTrendRange>(defaultRange);
  const tokens = useChartTokens();

  const metricTabs = metrics.map((m) => ({
    key: m,
    label: METRIC_CONFIG[m].label,
    panelId: `measurement-trend-${m}-panel`,
  }));
  const points = entries[metric] ?? NO_ENTRIES;
  const config = METRIC_CONFIG[metric];

  const filtered = useMemo(() => {
    if (range === 'all') return points;
    const reference = now ?? new Date();
    const cutoff = new Date(reference);
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - RANGE_DAYS[range] + 1);
    const cutoffIso = toIso(cutoff);
    return points.filter((e) => e.date >= cutoffIso);
  }, [points, range, now]);

  const isEmpty = filtered.length === 0;

  return (
    <AnalyticsScope properties={{ organism: 'MeasurementTrendCard' }}>
      <SectionCard title={title}>
        <Tabs
          tabs={metricTabs}
          active={metric}
          onChange={(k) => setMetric(k as MeasurementMetric)}
          label={`${title} metric`}
        />
        <div
          role="tabpanel"
          id={`measurement-trend-${metric}-panel`}
          aria-labelledby={`measurement-trend-${metric}-panel-tab`}
          className={recipes.stack.sm}
        >
          <Tabs
            tabs={RANGE_TABS}
            active={range}
            onChange={(k) => setRange(k as MeasurementTrendRange)}
            label={`${title} range`}
          />
          <div className="relative h-56 w-full">
            <Suspense fallback={null}>
              <MeasurementTrendChart
                entries={filtered}
                tokens={tokens}
                unit={config.unit}
                precision={config.precision}
                minPad={config.minPad}
                ariaLabel={ariaLabelFor(config.noun, range, filtered.length)}
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
                <Text variant="meta">{config.empty}</Text>
              </div>
            ) : null}
          </div>
        </div>
      </SectionCard>
    </AnalyticsScope>
  );
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function ariaLabelFor(noun: string, range: MeasurementTrendRange, count: number): string {
  if (count === 0) return `${noun} trend chart, no entries logged yet`;
  const window = range === 'all' ? 'all time' : `the last ${range}`;
  return `${noun} trend chart over ${window}, ${count} ${count === 1 ? 'entry' : 'entries'}`;
}
