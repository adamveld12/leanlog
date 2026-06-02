import { useEffect, useMemo, useState } from 'react';
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { SectionCard } from '../molecules/SectionCard';
import { Tabs } from '../molecules/Tabs';
import { Text } from '../atoms/Text';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export type WeightEntry = { date: string; weightLbs: number };
export type WeightTrendRange = '7d' | '30d' | '90d' | 'all';

export type WeightTrendCardProps = {
  entries: WeightEntry[];
  goalWeightLbs: number | null;
  defaultRange?: WeightTrendRange;
  now?: Date;
};

type Tokens = { text: string; muted: string; line: string };

const FALLBACK_TOKENS: Tokens = { text: '#151515', muted: '#606060', line: '#e8e8e8' };

const RANGE_DAYS: Record<Exclude<WeightTrendRange, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

const RANGE_TABS = [
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: 'all', label: 'All' },
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

  const { data, options } = useMemo(
    () => buildChart(filtered, goalWeightLbs, tokens),
    [filtered, goalWeightLbs, tokens],
  );

  const isEmpty = filtered.length === 0;

  return (
    <AnalyticsScope properties={{ organism: 'WeightTrendCard' }}>
      <SectionCard title="Weight Trend">
        <Tabs
          tabs={RANGE_TABS}
          active={range}
          onChange={(key) => setRange(key as WeightTrendRange)}
        />
        <div className="relative mt-3 h-56 w-full">
          <div
            className="absolute inset-0"
            role="img"
            aria-label={ariaLabelFor(range, filtered.length)}
          >
            <Line data={data} options={options} />
          </div>
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
  const [tokens, setTokens] = useState<Tokens>(readTokens);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    // Re-read the canvas colors whenever the theme attribute on <html> changes so the
    // chart tracks the CSS variables (chart.js writes to canvas and can't resolve var()).
    const observer = new MutationObserver(() => setTokens(readTokens()));
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

function buildChart(
  entries: WeightEntry[],
  goal: number | null,
  tokens: Tokens,
): { data: Parameters<typeof Line>[0]['data']; options: ChartOptions<'line'> } {
  const labels = entries.map((e) => e.date);
  const values = entries.map((e) => e.weightLbs);
  const [yMin, yMax] = domainFor(entries, goal);

  const goalDataset =
    goal != null && entries.length > 0
      ? [
          {
            label: `Goal ${goal}`,
            data: entries.map(() => goal),
            borderColor: tokens.muted,
            borderDash: [4, 4],
            borderWidth: 1,
            pointRadius: 0,
            pointHoverRadius: 0,
            tension: 0,
            fill: false,
          },
        ]
      : [];

  const data = {
    labels,
    datasets: [
      {
        label: 'Weight',
        data: values,
        borderColor: tokens.text,
        backgroundColor: tokens.text,
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      ...goalDataset,
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => formatTooltipDate(items[0]?.label ?? ''),
          label: (item) => `${item.parsed.y} lbs`,
        },
      },
    },
    scales: {
      x: {
        type: 'category',
        grid: { color: tokens.line, display: true, drawTicks: false },
        ticks: {
          color: tokens.muted,
          font: { size: 10 },
          maxRotation: 0,
          autoSkipPadding: 16,
          callback: function (_value, index) {
            const iso = (this.getLabelForValue?.(index as number) as string) ?? labels[index] ?? '';
            return formatTickDate(iso);
          },
        },
        border: { display: false },
      },
      y: {
        min: yMin,
        max: yMax,
        grid: { color: tokens.line },
        ticks: { color: tokens.muted, font: { size: 10 } },
        border: { display: false },
      },
    },
  };

  return { data, options };
}

function domainFor(entries: WeightEntry[], goal: number | null): [number, number] {
  if (entries.length === 0) return [0, 1];
  const values = entries.map((e) => e.weightLbs);
  if (goal != null) values.push(goal);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(2, Math.round((max - min) * 0.15));
  return [Math.floor(min - pad), Math.ceil(max + pad)];
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatTickDate(iso: string): string {
  if (!iso) return '';
  const d = parseIso(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTooltipDate(iso: string): string {
  if (!iso) return '';
  const d = parseIso(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function ariaLabelFor(range: WeightTrendRange, count: number): string {
  if (count === 0) return 'Weight trend chart, no entries logged yet';
  const window = range === 'all' ? 'all time' : `the last ${range}`;
  return `Weight trend chart over ${window}, ${count} ${count === 1 ? 'entry' : 'entries'}`;
}
