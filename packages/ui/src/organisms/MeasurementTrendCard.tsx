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
  // Per-day v-taper points (days where both shoulder + waist were logged — R15).
  vTaperEntries: MeasurementTrendEntry[];
  // Per-day shoulder points (#68 fast-follow).
  shoulderEntries: MeasurementTrendEntry[];
  // Per-day waist points (R16).
  waistEntries: MeasurementTrendEntry[];
  // Per-day bicep points (#68 fast-follow).
  bicepEntries: MeasurementTrendEntry[];
  // Per-day thigh / quad points (#68 fast-follow).
  thighEntries: MeasurementTrendEntry[];
  defaultMetric?: MeasurementMetric;
  defaultRange?: MeasurementTrendRange;
  now?: Date;
};

const RANGE_DAYS: Record<Exclude<MeasurementTrendRange, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

const METRIC_TABS = [
  { key: 'vtaper', label: 'V-Taper', panelId: 'measurement-trend-vtaper-panel' },
  { key: 'shoulder', label: 'Shoulder', panelId: 'measurement-trend-shoulder-panel' },
  { key: 'waist', label: 'Waist', panelId: 'measurement-trend-waist-panel' },
  { key: 'bicep', label: 'Bicep', panelId: 'measurement-trend-bicep-panel' },
  { key: 'thigh', label: 'Quad', panelId: 'measurement-trend-thigh-panel' },
];

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
  { unit: string; precision: number; minPad: number; noun: string; empty: string }
> = {
  vtaper: {
    unit: '',
    precision: 2,
    minPad: 0.05,
    noun: 'v-taper',
    empty: 'Log shoulder and waist on the day page to chart your v-taper over time.',
  },
  shoulder: {
    unit: 'in',
    precision: 1,
    minPad: 1,
    noun: 'shoulder',
    empty: 'Log your shoulders on the day page to chart them over time.',
  },
  waist: {
    unit: 'in',
    precision: 1,
    minPad: 1,
    noun: 'waist',
    empty: 'Log your waist on the day page to chart it over time.',
  },
  bicep: {
    unit: 'in',
    precision: 1,
    minPad: 1,
    noun: 'bicep',
    empty: 'Log your biceps on the day page to chart them over time.',
  },
  thigh: {
    unit: 'in',
    precision: 1,
    minPad: 1,
    noun: 'quad',
    empty: 'Log your quads on the day page to chart them over time.',
  },
};

export function MeasurementTrendCard({
  vTaperEntries,
  shoulderEntries,
  waistEntries,
  bicepEntries,
  thighEntries,
  defaultMetric = 'vtaper',
  defaultRange = '30d',
  now,
}: MeasurementTrendCardProps) {
  const [metric, setMetric] = useState<MeasurementMetric>(defaultMetric);
  const [range, setRange] = useState<MeasurementTrendRange>(defaultRange);
  const tokens = useChartTokens();

  const entriesByMetric: Record<MeasurementMetric, MeasurementTrendEntry[]> = {
    vtaper: vTaperEntries,
    shoulder: shoulderEntries,
    waist: waistEntries,
    bicep: bicepEntries,
    thigh: thighEntries,
  };
  const entries = entriesByMetric[metric];
  const config = METRIC_CONFIG[metric];

  const filtered = useMemo(() => {
    if (range === 'all') return entries;
    const reference = now ?? new Date();
    const cutoff = new Date(reference);
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - RANGE_DAYS[range] + 1);
    const cutoffIso = toIso(cutoff);
    return entries.filter((e) => e.date >= cutoffIso);
  }, [entries, range, now]);

  const isEmpty = filtered.length === 0;

  return (
    <AnalyticsScope properties={{ organism: 'MeasurementTrendCard' }}>
      <SectionCard title="Measurement Trends">
        <Tabs
          tabs={METRIC_TABS}
          active={metric}
          onChange={(k) => setMetric(k as MeasurementMetric)}
          label="Measurement"
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
            label="Measurement trend range"
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
