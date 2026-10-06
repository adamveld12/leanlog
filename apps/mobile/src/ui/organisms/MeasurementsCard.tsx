import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { MeasurementRow } from '../molecules/MeasurementRow';
import { MEASUREMENT_SITES, type Measurements, type SiteKey } from './measurementSites';

type Previous = Partial<Record<SiteKey, { value: number; date: string }>>;

type Props = {
  // Today's values (inches); optional per day (R9).
  values: Measurements;
  previous: Previous;
  onSave: (values: Measurements) => void;
};

export function MeasurementsCard({ values, previous, onSave }: Props) {
  // Draft form: props seed the editable fields; screens remount the card (key) when the saved value changes.
  // react-doctor-disable-next-line react-doctor/no-derived-useState
  const [draft, setDraft] = useState<Measurements>(values);
  return (
    <Card title="Measurements">
      {MEASUREMENT_SITES.map(({ key, label }) => (
        <MeasurementRow
          key={key}
          label={label}
          value={draft[key]}
          previous={previous[key] ?? null}
          onChangeValue={(v) => setDraft({ ...draft, [key]: v })}
        />
      ))}
      <Button label="Save measurements" onPress={() => onSave(draft)} />
    </Card>
  );
}
