import type { UnitSystem } from '@leanlog/data-access';
import { Card } from '../atoms/Card';
import { RadioGroup } from '../atoms/RadioGroup';

const unitOptions = [
  { value: 'imperial', label: 'Imperial (lb, in)' },
  { value: 'metric', label: 'Metric (kg, cm)' },
] as const;

type Props = { units: UnitSystem; onChangeUnits: (units: UnitSystem) => void };

export function SettingsCard({ units, onChangeUnits }: Props) {
  return (
    <Card title="Settings">
      <RadioGroup label="Units" options={unitOptions} value={units} onChange={onChangeUnits} />
    </Card>
  );
}
