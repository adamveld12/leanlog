import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { NumberField } from '../atoms/NumberField';
import { Text } from '../atoms/Text';
import { TrendChart } from '../molecules/TrendChart';

type Props = {
  // Chart points already in the display unit.
  points: readonly { date: string; value: number }[];
  unit: string;
  // "Weekly change: −0.8 lb", or null when there isn't enough data (see needsMoreText).
  weeklyChangeText: string | null;
  // Today's weight, canonical lb.
  todayLbs: number | null;
  editable: boolean;
  onSave: (lbs: number) => void;
};

export function WeightCard({ points, unit, weeklyChangeText, todayLbs, editable, onSave }: Props) {
  // Draft form: props seed the editable fields; screens remount the card (key) when the saved value changes.
  // react-doctor-disable-next-line react-doctor/no-derived-useState
  const [draft, setDraft] = useState<number | null>(todayLbs);
  return (
    <Card title="Weight">
      <TrendChart title="Weight" points={points} unit={unit} />
      {weeklyChangeText ? (
        <Text>{weeklyChangeText}</Text>
      ) : (
        <Text variant="helper">
          Weekly change needs at least 2 weigh-ins in each of the last two weeks.
        </Text>
      )}
      {editable ? (
        <>
          <NumberField
            label="Weight today"
            quantity="weight"
            value={draft}
            onChangeValue={setDraft}
          />
          <Button
            label="Save weight"
            disabled={draft == null || draft <= 0}
            onPress={() => draft != null && onSave(draft)}
          />
        </>
      ) : null}
    </Card>
  );
}
