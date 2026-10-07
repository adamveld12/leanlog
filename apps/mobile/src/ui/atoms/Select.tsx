import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { MIN_TOUCH, radius, spacing, useColors } from '../theme';
import { Text } from './Text';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  label: string;
  options: readonly Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  placeholder?: string;
};

// A modal list rather than a native <select>; works with a thumb on Android.
export function Select<T extends string>({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select…',
}: Props<T>) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="helper">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label ?? placeholder}`}
        onPress={() => setOpen(true)}
        style={{
          minHeight: MIN_TOUCH,
          paddingHorizontal: spacing.md,
          borderRadius: radius.control,
          borderWidth: 1,
          borderColor: c.lineStrong,
          justifyContent: 'center',
        }}
      >
        <Text>{current?.label ?? placeholder}</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          accessibilityLabel="Close"
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: '#00000066',
            justifyContent: 'center',
            padding: spacing.xl,
          }}
        >
          <View
            style={{
              backgroundColor: c.surface,
              borderRadius: radius.card,
              padding: spacing.sm,
            }}
          >
            {options.map((option) => (
              <Pressable
                key={option.value}
                accessibilityRole="menuitem"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: option.value === value }}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                style={{
                  minHeight: MIN_TOUCH,
                  paddingHorizontal: spacing.md,
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontWeight: option.value === value ? '700' : '400' }}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
