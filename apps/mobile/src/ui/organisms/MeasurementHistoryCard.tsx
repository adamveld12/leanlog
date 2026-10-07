import { useState } from 'react';
import { View } from 'react-native';
import { spacing } from '../theme';
import { Card } from '../atoms/Card';
import { Select } from '../atoms/Select';
import { Text } from '../atoms/Text';
import { TrendChart } from '../molecules/TrendChart';
import { MEASUREMENT_SITES, type SiteKey } from './measurementSites';

type Props = {
  // Per-site history in the display unit, oldest first.
  series: Record<SiteKey, readonly { date: string; value: number }[]>;
  unit: string;
};

const options = MEASUREMENT_SITES.map((s) => ({ value: s.key, label: s.label }));

// A history for each measurement site (R11).
export function MeasurementHistoryCard({ series, unit }: Props) {
  const [site, setSite] = useState<SiteKey>('waistIn');
  const points = series[site];
  const label = MEASUREMENT_SITES.find((s) => s.key === site)?.label ?? '';
  return (
    <Card title="Measurement history">
      <Select label="History site" options={options} value={site} onChange={setSite} />
      <TrendChart title={label} points={points} unit={unit} />
      {points.length === 0 ? <Text variant="helper">No entries for this site yet.</Text> : null}
      <View style={{ gap: spacing.xs }}>
        {[...points]
          .reverse()
          .slice(0, 5)
          .map((p) => (
            <Text key={p.date} variant="helper">{`${p.date}: ${p.value} ${unit}`}</Text>
          ))}
      </View>
    </Card>
  );
}
