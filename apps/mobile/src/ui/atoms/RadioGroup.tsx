import { Pressable, View } from 'react-native';
import { MIN_TOUCH, radius, spacing, useColors } from '../theme';
import { Text } from './Text';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  label: string;
  options: readonly Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
};

export function RadioGroup<T extends string>({ label, options, value, onChange }: Props<T>) {
  const c = useColors();
  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="helper">{label}</Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}
      >
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked }}
              onPress={() => onChange(option.value)}
              style={{
                minHeight: MIN_TOUCH,
                paddingHorizontal: spacing.lg,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: checked ? c.text : c.lineStrong,
                backgroundColor: checked ? c.text : 'transparent',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: checked ? c.onPrimary : c.text, fontWeight: '600' }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
