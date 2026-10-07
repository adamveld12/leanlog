import { View } from 'react-native';
import { spacing } from '../theme';
import { NumberField } from '../atoms/NumberField';
import { Text } from '../atoms/Text';

type Props = {
  label: string;
  // Today's value in inches (null if not logged).
  value: number | null;
  onChangeValue: (value: number | null) => void;
  // Last logged value shown as context, in inches.
  previous?: { value: number; date: string } | null;
};

export function MeasurementRow({ label, value, onChangeValue, previous }: Props) {
  return (
    <View style={{ gap: spacing.xs }}>
      <NumberField label={label} quantity="length" value={value} onChangeValue={onChangeValue} />
      {previous ? (
        <Text variant="helper">{`Last: ${previous.value} in (${previous.date})`}</Text>
      ) : null}
    </View>
  );
}
