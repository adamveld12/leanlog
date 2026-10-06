import { View } from 'react-native';
import { spacing } from '../theme';
import { ProgressBar } from '../atoms/ProgressBar';
import { Text } from '../atoms/Text';

type Macros = { calories: number; protein: number; carbs: number; fat: number };

type Props = {
  consumed: Macros;
  // Null for a day that has no targets row.
  targets: Macros | null;
};

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

// Running totals against the day's targets. Macro order is always P / C / F.
export function MacroTotals({ consumed, targets }: Props) {
  if (!targets) {
    return (
      <View style={{ gap: spacing.xs }}>
        <Text style={{ fontSize: 20, fontWeight: '700' }}>{`${fmt(consumed.calories)} kcal`}</Text>
        <Text variant="helper">
          {`P ${fmt(consumed.protein)} · C ${fmt(consumed.carbs)} · F ${fmt(consumed.fat)}`}
        </Text>
      </View>
    );
  }
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>
        {`${fmt(consumed.calories)} / ${fmt(targets.calories)} kcal`}
      </Text>
      <ProgressBar label="Calories" value={consumed.calories} max={targets.calories} />
      <Text variant="helper">
        {`P ${fmt(consumed.protein)}/${fmt(targets.protein)} · C ${fmt(consumed.carbs)}/${fmt(targets.carbs)} · F ${fmt(consumed.fat)}/${fmt(targets.fat)}`}
      </Text>
    </View>
  );
}
