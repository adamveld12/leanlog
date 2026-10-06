import { View } from 'react-native';
import { Text } from './Text';

type Props = { label: string; value: string; unit?: string; testID?: string };

export function Stat({ label, value, unit, testID }: Props) {
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}
    >
      <Text variant="helper">{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Text style={{ fontSize: 20, fontWeight: '700' }}>{value}</Text>
        {unit ? <Text variant="unit">{unit}</Text> : null}
      </View>
    </View>
  );
}
