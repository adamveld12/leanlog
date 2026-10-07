import type { UnitSystem } from '@leanlog/data-access';
import { Card } from '../atoms/Card';
import { RadioGroup } from '../atoms/RadioGroup';
import { Text } from '../atoms/Text';

const unitOptions = [
  { value: 'imperial', label: 'Imperial (lb, in)' },
  { value: 'metric', label: 'Metric (kg, cm)' },
] as const;

const analyticsOptions = [
  { value: 'off', label: 'Off' },
  { value: 'on', label: 'On' },
] as const;

type Props = {
  units: UnitSystem;
  onChangeUnits: (units: UnitSystem) => void;
  // Only passed when this build has analytics configured; otherwise the toggle is not shown.
  analytics?: { enabled: boolean; onChange: (enabled: boolean) => void };
};

export function SettingsCard({ units, onChangeUnits, analytics }: Props) {
  return (
    <Card title="Settings">
      <RadioGroup label="Units" options={unitOptions} value={units} onChange={onChangeUnits} />
      {analytics ? (
        <>
          <RadioGroup
            label="Anonymous analytics"
            options={analyticsOptions}
            value={analytics.enabled ? 'on' : 'off'}
            onChange={(v) => analytics.onChange(v === 'on')}
          />
          <Text variant="helper">
            Off by default. If you turn it on, Leanlog sends anonymous usage counts and crash
            reports, never your food, weight or measurements.
          </Text>
        </>
      ) : null}
    </Card>
  );
}
