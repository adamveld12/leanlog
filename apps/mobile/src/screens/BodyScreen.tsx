import { useRouter } from 'expo-router';
import {
  toDisplayLength,
  toDisplayWeight,
  vTaperRatio,
  weeklyWeightDelta,
} from '@leanlog/data-access';
import { Screen } from '../ui/atoms/Screen';
import { Text } from '../ui/atoms/Text';
import { formatSigned } from '../ui/format';
import { BodyFatTrendCard } from '../ui/organisms/BodyFatTrendCard';
import { MeasurementHistoryCard } from '../ui/organisms/MeasurementHistoryCard';
import { MeasurementsCard } from '../ui/organisms/MeasurementsCard';
import {
  MEASUREMENT_SITES,
  type Measurements,
  type SiteKey,
} from '../ui/organisms/measurementSites';
import { VTaperCard } from '../ui/organisms/VTaperCard';
import { WeightCard } from '../ui/organisms/WeightCard';
import { useMobileStore } from '../state/MobileStore';
import { useRunAction } from './useRunAction';

const RECENT = 30;

export function BodyScreen() {
  const { state, actions } = useMobileStore();
  const router = useRouter();
  const { error, saved, run } = useRunAction();

  if (state.status !== 'ready') {
    return (
      <Screen>
        <Text variant="helper">Loading…</Text>
      </Screen>
    );
  }
  const { data, today } = state;
  const units = data.settings.units;
  const weightUnit = units === 'imperial' ? 'lb' : 'kg';
  const lengthUnit = units === 'imperial' ? 'in' : 'cm';

  const days = data.days;
  const todayRow = days.find((d) => d.date === today) ?? null;
  const weighed = days.flatMap((d) =>
    d.weightLbs == null ? [] : [{ date: d.date, weightLbs: d.weightLbs }],
  );
  const delta = weeklyWeightDelta(weighed, today);

  const siteSeries = (key: SiteKey) =>
    days.flatMap((d) => (d[key] == null ? [] : [{ date: d.date, value: d[key] }]));

  const previous: Partial<Record<SiteKey, { value: number; date: string }>> = {};
  for (const { key } of MEASUREMENT_SITES) {
    const earlier = siteSeries(key).filter((p) => p.date < today);
    const last = earlier[earlier.length - 1];
    if (last) previous[key] = { value: last.value, date: last.date };
  }

  const series = Object.fromEntries(
    MEASUREMENT_SITES.map(({ key }) => [
      key,
      siteSeries(key)
        .slice(-RECENT)
        .map((p) => ({
          date: p.date,
          value: Math.round(toDisplayLength(p.value, units) * 10) / 10,
        })),
    ]),
  ) as Record<SiteKey, { date: string; value: number }[]>;

  const withBoth = days.filter((d) => d.date <= today && d.shoulderIn != null && d.waistIn != null);
  const latestBoth = withBoth[withBoth.length - 1];
  const ratio = latestBoth ? vTaperRatio(latestBoth.shoulderIn, latestBoth.waistIn) : null;

  const todayValues = Object.fromEntries(
    MEASUREMENT_SITES.map(({ key }) => [key, todayRow?.[key] ?? null]),
  ) as Measurements;

  return (
    <Screen>
      <WeightCard
        key={`weight:${todayRow?.weightLbs ?? ''}`}
        points={weighed.slice(-RECENT).map((w) => ({
          date: w.date,
          value: Math.round(toDisplayWeight(w.weightLbs, units) * 10) / 10,
        }))}
        unit={weightUnit}
        weeklyChangeText={
          delta
            ? `Weekly change: ${formatSigned(Math.round(toDisplayWeight(delta.deltaLbs, units) * 10) / 10, 1)} ${weightUnit}`
            : null
        }
        todayLbs={todayRow?.weightLbs ?? null}
        editable
        onSave={(lbs) => void run(() => actions.logWeight(lbs))}
      />
      <MeasurementsCard
        key={`measurements:${JSON.stringify(todayValues)}`}
        values={todayValues}
        previous={previous}
        onSave={(values) => void run(() => actions.setMeasurements(values))}
      />
      <VTaperCard ratio={ratio} />
      <MeasurementHistoryCard series={series} unit={lengthUnit} />
      <BodyFatTrendCard
        results={data.bodyFatResults}
        onCalculate={() => router.push('/body-fat')}
      />
      {saved ? <Text variant="helper">Saved</Text> : null}
      {error ? <Text variant="warning">{error}</Text> : null}
    </Screen>
  );
}
