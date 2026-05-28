import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { SectionCard } from '../molecules/SectionCard';
import { Tabs } from '../molecules/Tabs';
import { Text } from '../atoms/Text';

export type WeightEntry = { date: string; weightLbs: number };
export type WeightTrendRange = '7d' | '30d' | '90d' | 'all';

export type WeightTrendCardProps = {
  entries: WeightEntry[];
  goalWeightLbs: number | null;
  defaultRange?: WeightTrendRange;
  now?: Date;
};

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

  const filtered = useMemo(() => {
    if (range === 'all') return entries;
    const reference = now ?? new Date();
    const cutoff = new Date(reference);
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - RANGE_DAYS[range] + 1);
    const cutoffIso = toIso(cutoff);
    return entries.filter((e) => e.date >= cutoffIso);
  }, [entries, range, now]);

  const yDomain = useMemo(() => domainFor(filtered, goalWeightLbs), [filtered, goalWeightLbs]);

  return (
    <AnalyticsScope properties={{ organism: 'WeightTrendCard' }}>
      <SectionCard title="Weight Trend">
        <Tabs
          tabs={RANGE_TABS}
          active={range}
          onChange={(key) => setRange(key as WeightTrendRange)}
        />
        <div
          className="relative mt-2.5 h-56 w-full"
          role="img"
          aria-label={ariaLabelFor(range, filtered.length)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filtered} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--ll-line)" strokeDasharray="2 3" />
              <XAxis
                dataKey="date"
                tickFormatter={formatTickDate}
                stroke="var(--ll-text-muted)"
                fontSize={10}
                tickMargin={6}
                minTickGap={24}
              />
              <YAxis
                domain={yDomain}
                stroke="var(--ll-text-muted)"
                fontSize={10}
                width={36}
                tickFormatter={(v: number) => String(Math.round(v))}
              />
              <Tooltip
                formatter={(value) => [`${value} lbs`, 'Weight']}
                labelFormatter={(label) =>
                  typeof label === 'string' ? formatTooltipDate(label) : String(label ?? '')
                }
                contentStyle={{
                  background: 'var(--ll-surface)',
                  border: '1px solid var(--ll-line)',
                  borderRadius: 10,
                  fontSize: 12,
                }}
              />
              {goalWeightLbs != null ? (
                <ReferenceLine
                  y={goalWeightLbs}
                  stroke="var(--ll-text-muted)"
                  strokeDasharray="4 4"
                  label={{
                    value: `Goal ${goalWeightLbs}`,
                    position: 'insideTopRight',
                    fill: 'var(--ll-text-muted)',
                    fontSize: 10,
                  }}
                />
              ) : null}
              <Line
                type="monotone"
                dataKey="weightLbs"
                stroke="var(--ll-text)"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
          {filtered.length === 0 ? (
            <div
              role="status"
              className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--ll-surface)_88%,transparent)] p-4 text-center"
            >
              <Text variant="body" style={{ color: 'var(--ll-text-muted)' }}>
                {EMPTY_TEXT}
              </Text>
            </div>
          ) : null}
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

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatTickDate(iso: string): string {
  const d = parseIso(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTooltipDate(iso: string): string {
  const d = parseIso(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function ariaLabelFor(range: WeightTrendRange, count: number): string {
  if (count === 0) return 'Weight trend chart, no entries logged yet';
  const window = range === 'all' ? 'all time' : `the last ${range}`;
  return `Weight trend chart over ${window}, ${count} ${count === 1 ? 'entry' : 'entries'}`;
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
