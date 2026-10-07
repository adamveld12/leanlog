import { View } from 'react-native';
import { BODYWEIGHT_FALLBACK_MULTIPLIER, type ProfileTargets } from '@leanlog/data-access';
import { spacing } from '../theme';
import { Text } from '../atoms/Text';

type Props = {
  basis: ProfileTargets['basis'];
  breakdown: ProfileTargets['breakdown'];
  calorieDelta: number;
  targetCalories: number;
};

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
// Typographic minus so a negative delta reads as a subtraction.
const signed = (n: number) => (n < 0 ? `−${fmt(-n)}` : `+${fmt(n)}`);

// The live Katch chain on the profile screen (R20).
export function TargetBreakdown({ basis, breakdown, calorieDelta, targetCalories }: Props) {
  if (basis === 'bodyweight' || !breakdown) {
    return (
      <Text>{`Bodyweight × ${BODYWEIGHT_FALLBACK_MULTIPLIER} = ${fmt(targetCalories)} kcal`}</Text>
    );
  }
  return (
    <View style={{ gap: spacing.xs }}>
      <Text>{`LBM ${breakdown.lbmKg.toFixed(1)} kg → BMR ${fmt(breakdown.bmr)}`}</Text>
      <Text>{`+ activity ${fmt(breakdown.activityKcal)} → ${signed(calorieDelta)}`}</Text>
      <Text style={{ fontWeight: '700' }}>{`= ${fmt(targetCalories)} kcal`}</Text>
    </View>
  );
}
