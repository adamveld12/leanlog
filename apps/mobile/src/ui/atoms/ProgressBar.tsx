import { View } from 'react-native';
import { radius, useColors } from '../theme';

type Props = {
  value: number;
  max: number;
  label: string;
  testID?: string;
};

export function ProgressBar({ value, max, label, testID }: Props) {
  const c = useColors();
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: Math.round(max), now: Math.round(value) }}
      style={{ height: 8, borderRadius: radius.pill, backgroundColor: c.line, overflow: 'hidden' }}
    >
      <View
        style={{
          width: `${ratio * 100}%`,
          height: '100%',
          backgroundColor: value > max ? c.warn : c.saved,
        }}
      />
    </View>
  );
}
