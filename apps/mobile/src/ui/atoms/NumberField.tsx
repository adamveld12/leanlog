import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import {
  fromDisplayLength,
  fromDisplayWeight,
  toDisplayLength,
  toDisplayWeight,
} from '@leanlog/data-access';
import { MIN_TOUCH, radius, spacing, useColors } from '../theme';
import { useUnitSystem } from '../units';
import { Text } from './Text';

type Props = {
  label: string;
  // Stored value: lb / in for quantities, otherwise the number as shown.
  value: number | null;
  onChangeValue: (value: number | null) => void;
  // Converted for display (lb↔kg, in↔cm); `value` stays canonical.
  quantity?: 'weight' | 'length';
  // Fixed suffix for plain numbers (g, kcal, mm).
  unit?: string;
  testID?: string;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

function parse(text: string): number | null {
  if (text.trim() === '') return null;
  const n = Number(text.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function NumberField({ label, value, onChangeValue, quantity, unit, testID }: Props) {
  const c = useColors();
  const system = useUnitSystem();
  // While focused the field shows what the user typed ("82." must stay "82.").
  const [draft, setDraft] = useState<string | null>(null);

  const toDisplay = (v: number) =>
    quantity === 'weight'
      ? toDisplayWeight(v, system)
      : quantity === 'length'
        ? toDisplayLength(v, system)
        : v;
  const fromDisplay = (v: number) =>
    quantity === 'weight'
      ? fromDisplayWeight(v, system)
      : quantity === 'length'
        ? fromDisplayLength(v, system)
        : v;
  const suffix =
    quantity === 'weight'
      ? system === 'imperial'
        ? 'lb'
        : 'kg'
      : quantity === 'length'
        ? system === 'imperial'
          ? 'in'
          : 'cm'
        : unit;

  const shown = draft ?? (value == null ? '' : String(round1(toDisplay(value))));

  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="helper">{label}</Text>
      <View style={[styles.box, { borderColor: c.lineStrong }]}>
        <TextInput
          testID={testID}
          accessibilityLabel={label}
          value={shown}
          keyboardType="decimal-pad"
          onFocus={() => setDraft(value == null ? '' : String(round1(toDisplay(value))))}
          onBlur={() => setDraft(null)}
          onChangeText={(text) => {
            setDraft(text);
            const n = parse(text);
            onChangeValue(n == null ? null : fromDisplay(n));
          }}
          style={[styles.input, { color: c.text }]}
        />
        {suffix ? <Text variant="unit">{suffix}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.md,
    borderRadius: radius.control,
    borderWidth: 1,
    gap: spacing.sm,
  },
  input: { flex: 1, fontSize: 16 },
});
