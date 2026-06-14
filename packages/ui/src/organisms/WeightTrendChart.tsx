import { useMemo } from 'react';
// This whole module is loaded via React.lazy from WeightTrendCard, so chart.js and
// react-chartjs-2 already land in their own chunk (verified: WeightTrendChart-*.js, ~171kB,
// out of the main bundle). react-doctor flags the static imports here because it can't see
// the dynamic-import boundary, so the prefer-dynamic-import warnings are suppressed.
// react-doctor-disable-next-line react-doctor/prefer-dynamic-import
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
// react-doctor-disable-next-line react-doctor/prefer-dynamic-import
import { Line } from 'react-chartjs-2';
import type { Tokens, WeightEntry } from './WeightTrendCard';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export type WeightTrendChartProps = {
  entries: WeightEntry[];
  goalWeightLbs: number | null;
  tokens: Tokens;
  ariaLabel: string;
};

// Rendered through React.lazy from WeightTrendCard so chart.js + react-chartjs-2 ship in
// their own chunk instead of the initial bundle (react-doctor: prefer-dynamic-import).
export default function WeightTrendChart({
  entries,
  goalWeightLbs,
  tokens,
  ariaLabel,
}: WeightTrendChartProps) {
  const { data, options } = useMemo(
    () => buildChart(entries, goalWeightLbs, tokens),
    [entries, goalWeightLbs, tokens],
  );

  return (
    // role="img" describes the canvas chart to assistive tech; <progress>/<img> tags don't
    // fit a chart.js canvas, so the role is intentional.
    // react-doctor-disable-next-line react-doctor/prefer-tag-over-role
    <div className="absolute inset-0" role="img" aria-label={ariaLabel}>
      <Line data={data} options={options} />
    </div>
  );
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
