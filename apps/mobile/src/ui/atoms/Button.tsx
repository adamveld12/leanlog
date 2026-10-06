import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { MIN_TOUCH, radius, spacing, useColors } from '../theme';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  // Overrides the spoken name when the visible label is a glyph.
  accessibilityLabel?: string;
  testID?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  accessibilityLabel,
  testID,
}: Props) {
  const c = useColors();
  const filled = variant === 'primary' || variant === 'danger';
  const background =
    variant === 'primary' ? c.text : variant === 'danger' ? c.danger : 'transparent';
  const labelColor = filled ? c.onPrimary : c.text;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        {
          minHeight: MIN_TOUCH,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.control,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: background,
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: c.lineStrong,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      <Text style={{ color: labelColor, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}
