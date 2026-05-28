import { useMemo, useState } from 'react';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { HelperText } from '../atoms/HelperText';
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

const VIEW_W = 600;
const VIEW_H = 220;
const PAD = { top: 12, right: 16, bottom: 24, left: 36 };

export function WeightTrendCard({
  entries,
  goalWeightLbs,
  defaultRange = '30d',
  now,
}: WeightTrendCardProps) {
  const [range, setRange] = useState<WeightTrendRange>(defaultRange);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const filtered = useMemo(() => {
    if (range === 'all') return entries;
    const reference = now ?? new Date();
    const cutoff = new Date(reference);
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - RANGE_DAYS[range] + 1);
    const cutoffIso = toIso(cutoff);
    return entries.filter((e) => e.date >= cutoffIso);
  }, [entries, range, now]);

  const layout = useMemo(() => buildLayout(filtered, goalWeightLbs), [filtered, goalWeightLbs]);

  return (
    <AnalyticsScope properties={{ organism: 'WeightTrendCard' }}>
      <SectionCard title="Weight Trend">
        <Tabs
          tabs={RANGE_TABS}
          active={range}
          onChange={(key) => setRange(key as WeightTrendRange)}
        />
        <div
          className="relative mt-2.5 w-full"
          role="img"
          aria-label={ariaLabelFor(range, filtered.length)}
        >
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            preserveAspectRatio="none"
            className="block h-56 w-full"
            onMouseLeave={() => setHoverIdx(null)}
          >
            {/* Y gridlines + labels */}
            {layout.yTicks.map((t) => (
              <g key={`yt-${t.value}`}>
                <line
                  x1={PAD.left}
                  x2={VIEW_W - PAD.right}
                  y1={t.y}
                  y2={t.y}
                  stroke="var(--ll-line)"
                  strokeDasharray="2 3"
                />
                <text
                  x={PAD.left - 6}
                  y={t.y}
                  dominantBaseline="middle"
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--ll-text-muted)"
                >
                  {t.value}
                </text>
              </g>
            ))}

            {/* X labels */}
            {layout.xTicks.map((t) => (
              <text
                key={`xt-${t.iso}`}
                x={t.x}
                y={VIEW_H - PAD.bottom + 14}
                textAnchor="middle"
                fontSize="10"
                fill="var(--ll-text-muted)"
              >
                {formatTickDate(t.iso)}
              </text>
            ))}

            {/* Goal line */}
            {layout.goalY != null && goalWeightLbs != null ? (
              <g>
                <line
                  x1={PAD.left}
                  x2={VIEW_W - PAD.right}
                  y1={layout.goalY}
                  y2={layout.goalY}
                  stroke="var(--ll-text-muted)"
                  strokeDasharray="4 4"
                />
                <text
                  x={VIEW_W - PAD.right - 4}
                  y={layout.goalY - 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--ll-text-muted)"
                >
                  Goal {goalWeightLbs}
                </text>
              </g>
            ) : null}

            {/* Data line + dots */}
            {layout.points.length > 1 ? (
              <polyline
                points={layout.points.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="var(--ll-text)"
                strokeWidth="2"
              />
            ) : null}
            {layout.points.map((p, i) => (
              <circle
                key={`d-${p.iso}`}
                cx={p.x}
                cy={p.y}
                r={i === hoverIdx ? 5 : 3}
                fill="var(--ll-text)"
              />
            ))}

            {/* Hit-targets for hover */}
            {layout.points.map((p, i) => (
              <rect
                key={`h-${p.iso}`}
                x={p.x - layout.hitWidth / 2}
                y={PAD.top}
                width={layout.hitWidth}
                height={VIEW_H - PAD.top - PAD.bottom}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(i)}
              />
            ))}
          </svg>

          {hoverIdx != null && layout.points[hoverIdx] ? (
            <Tooltip
              x={layout.points[hoverIdx].x}
              y={layout.points[hoverIdx].y}
              iso={layout.points[hoverIdx].iso}
              weightLbs={layout.points[hoverIdx].weightLbs}
            />
          ) : null}

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

function Tooltip({
  x,
  y,
  iso,
  weightLbs,
}: {
  x: number;
  y: number;
  iso: string;
  weightLbs: number;
}) {
  const leftPct = (x / VIEW_W) * 100;
  const topPct = (y / VIEW_H) * 100;
  return (
    <div
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-[10px] border border-[var(--ll-line)] bg-[var(--ll-surface)] px-2 py-1 shadow-sm"
      style={{ left: `${leftPct}%`, top: `calc(${topPct}% - 8px)` }}
    >
      <HelperText>{formatTooltipDate(iso)}</HelperText>
      <Text variant="body" className="font-medium">
        {weightLbs} lbs
      </Text>
    </div>
  );
}

type YTick = { value: number; y: number };
type XTick = { iso: string; x: number };
type Point = { iso: string; weightLbs: number; x: number; y: number };
type Layout = {
  yTicks: YTick[];
  xTicks: XTick[];
  points: Point[];
  goalY: number | null;
  hitWidth: number;
};

function buildLayout(entries: WeightEntry[], goal: number | null): Layout {
  if (entries.length === 0) {
    return { yTicks: [], xTicks: [], points: [], goalY: null, hitWidth: 0 };
  }
  const innerW = VIEW_W - PAD.left - PAD.right;
  const innerH = VIEW_H - PAD.top - PAD.bottom;
  const [yMin, yMax] = domainFor(entries, goal);
  const yRange = yMax - yMin || 1;
  const yToPx = (v: number) => PAD.top + ((yMax - v) / yRange) * innerH;

  const points: Point[] = entries.map((e, i) => {
    const x =
      entries.length === 1 ? PAD.left + innerW / 2 : PAD.left + (i / (entries.length - 1)) * innerW;
    return { iso: e.date, weightLbs: e.weightLbs, x, y: yToPx(e.weightLbs) };
  });

  const yTicks: YTick[] = [];
  const tickCount = 4;
  for (let i = 0; i <= tickCount; i++) {
    const value = Math.round(yMin + ((yMax - yMin) * i) / tickCount);
    yTicks.push({ value, y: yToPx(value) });
  }

  const xTicks: XTick[] = pickXTicks(points);
  const hitWidth = entries.length > 1 ? innerW / (entries.length - 1) : innerW;
  const goalY = goal != null ? yToPx(goal) : null;

  return { yTicks, xTicks, points, goalY, hitWidth };
}

function pickXTicks(points: Point[]): XTick[] {
  if (points.length === 0) return [];
  const maxTicks = 5;
  if (points.length <= maxTicks) {
    return points.map((p) => ({ iso: p.iso, x: p.x }));
  }
  const step = (points.length - 1) / (maxTicks - 1);
  return Array.from({ length: maxTicks }, (_, i) => {
    const p = points[Math.round(i * step)];
    return { iso: p.iso, x: p.x };
  });
}

function domainFor(entries: WeightEntry[], goal: number | null): [number, number] {
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
