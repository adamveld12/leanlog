import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { SectionCard } from '../molecules/SectionCard';
import { Tabs } from '../molecules/Tabs';
import { Text } from '../atoms/Text';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

// chart.js + react-chartjs-2 are heavy; load them on demand in their own chunk rather than
// the initial bundle (react-doctor: prefer-dynamic-import). A chunk-load failure surfaces to
// the app-level AnalyticsErrorBoundary; the card keeps its fixed height so nothing shifts.
const WeightTrendChart = lazy(() => import('./WeightTrendChart'));

export type WeightEntry = { date: string; weightLbs: number };
export type WeightTrendRange = '7d' | '30d' | '90d' | 'all';

export type WeightTrendCardProps = {
  entries: WeightEntry[];
  goalWeightLbs: number | null;
  defaultRange?: WeightTrendRange;
  now?: Date;
};

export type Tokens = { text: string; muted: string; line: string };

const FALLBACK_TOKENS: Tokens = { text: '#151515', muted: '#606060', line: '#e8e8e8' };

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

const EMPTY_TEXT = 'Start logging your weight on the day page! Your progress will appear here';

export function WeightTrendCard({
  entries,
  goalWeightLbs,
  defaultRange = '30d',
  now,
}: WeightTrendCardProps) {
  const [range, setRange] = useState<WeightTrendRange>(defaultRange);
  const tokens = useThemeTokens();

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
    <AnalyticsScope properties={{ organism: 'WeightTrendCard' }}>
      <SectionCard title="Weight Trend">
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
          className="relative h-56 w-full"
        >
          <Suspense fallback={null}>
            <WeightTrendChart
              entries={filtered}
              goalWeightLbs={goalWeightLbs}
              tokens={tokens}
              ariaLabel={ariaLabelFor(range, filtered.length)}
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
              <Text variant="meta">{EMPTY_TEXT}</Text>
            </div>
          ) : null}
        </div>
      </SectionCard>
    </AnalyticsScope>
  );
}

function useThemeTokens(): Tokens {
  // Initial value comes from the useState initializer (no extra render); the effect below only
  // re-syncs on later theme mutations, so this isn't a "state initialized from an effect" case.
  const [tokens, setTokens] = useState<Tokens>(readTokens);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    // Re-read the canvas colors whenever the theme attribute on <html> changes so the
    // chart tracks the CSS variables (chart.js writes to canvas and can't resolve var()).
    // This observer only re-syncs on theme mutation; initial tokens come from useState above,
    // so react-doctor's "state initialized from a mount effect" is a false positive here.
    const observer = new MutationObserver(() => setTokens(readTokens()));
    // react-doctor-disable-next-line react-doctor/no-initialize-state
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });
    return () => observer.disconnect();
  }, []);
  return tokens;
}

function readTokens(): Tokens {
  if (typeof document === 'undefined') return FALLBACK_TOKENS;
  const cs = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  return {
    text: read('--ll-text', FALLBACK_TOKENS.text),
    muted: read('--ll-text-muted', FALLBACK_TOKENS.muted),
    line: read('--ll-line', FALLBACK_TOKENS.line),
  };
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function ariaLabelFor(range: WeightTrendRange, count: number): string {
  if (count === 0) return 'Weight trend chart, no entries logged yet';
  const window = range === 'all' ? 'all time' : `the last ${range}`;
  return `Weight trend chart over ${window}, ${count} ${count === 1 ? 'entry' : 'entries'}`;
}
