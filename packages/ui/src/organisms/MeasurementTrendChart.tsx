import { useMemo } from 'react';
// Loaded via React.lazy from MeasurementTrendCard, so chart.js + react-chartjs-2 land in a
// shared chunk rather than the initial bundle (the WeightTrendChart chunk pulls the same deps).
// react-doctor can't see the dynamic-import boundary, so its prefer-dynamic-import warnings are
// suppressed here.
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
import type { Tokens } from './chartTokens';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export type MeasurementPoint = { date: string; value: number };

export type MeasurementTrendChartProps = {
  entries: MeasurementPoint[];
  tokens: Tokens;
  ariaLabel: string;
  // Trailing unit shown in the tooltip (e.g. "in"); empty for the unitless ratio.
  unit: string;
  // Decimal places for axis ticks + tooltip values (v-taper 2, waist 1).
  precision: number;
  // Minimum y-axis padding so a near-flat series (e.g. a ratio hovering ~1.5)
  // still has visual headroom instead of a hairline.
  minPad: number;
};

// Rendered through React.lazy from MeasurementTrendCard so chart.js + react-chartjs-2 stay out
// of the initial bundle. Mirrors WeightTrendChart, generalized to a single labeled series with
// no goal line.
export default function MeasurementTrendChart({
  entries,
  tokens,
  ariaLabel,
  unit,
  precision,
  minPad,
}: MeasurementTrendChartProps) {
  const { data, options } = useMemo(
    () => buildChart(entries, tokens, unit, precision, minPad),
    [entries, tokens, unit, precision, minPad],
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
  entries: MeasurementPoint[],
  tokens: Tokens,
  unit: string,
  precision: number,
  minPad: number,
): { data: Parameters<typeof Line>[0]['data']; options: ChartOptions<'line'> } {
  const labels = entries.map((e) => e.date);
  const values = entries.map((e) => e.value);
  const [yMin, yMax] = domainFor(values, minPad);
  const unitSuffix = unit ? ` ${unit}` : '';

  const data = {
    labels,
    datasets: [
      {
        label: 'Measurement',
        data: values,
        borderColor: tokens.text,
        backgroundColor: tokens.text,
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
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
          label: (item) => `${(item.parsed.y ?? 0).toFixed(precision)}${unitSuffix}`,
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
        ticks: {
          color: tokens.muted,
          font: { size: 10 },
          callback: (value) => Number(value).toFixed(precision),
        },
        border: { display: false },
      },
    },
  };

  return { data, options };
}

function domainFor(values: number[], minPad: number): [number, number] {
  if (values.length === 0) return [0, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(minPad, (max - min) * 0.15);
  return [min - pad, max + pad];
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
