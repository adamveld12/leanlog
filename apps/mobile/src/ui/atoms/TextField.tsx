import { TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { MIN_TOUCH, radius, spacing, useColors } from '../theme';
import { Text } from './Text';

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  testID?: string;
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  testID,
}: Props) {
  const c = useColors();
  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="helper">{label}</Text>
      <TextInput
        testID={testID}
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
        keyboardType={keyboardType}
        style={{
          minHeight: MIN_TOUCH,
          paddingHorizontal: spacing.md,
          borderRadius: radius.control,
          borderWidth: 1,
          borderColor: c.lineStrong,
          color: c.text,
          fontSize: 16,
        }}
      />
    </View>
  );
}
