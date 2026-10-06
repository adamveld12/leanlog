import { View } from 'react-native';
import { spacing } from '../theme';
import { NumberField } from '../atoms/NumberField';
import type { NutritionDraft } from './nutritionDraft';

type Props = {
  value: NutritionDraft;
  onChange: (next: NutritionDraft) => void;
};

// The web app's full ingredient field set (R2), minus name and grams.
export function NutritionInputs({ value, onChange }: Props) {
  const field = (key: keyof NutritionDraft, label: string, unit: string) => (
    <NumberField
      label={label}
      unit={unit}
      value={value[key]}
      onChangeValue={(v) => onChange({ ...value, [key]: v })}
    />
  );
  return (
    <View style={{ gap: spacing.md }}>
      {field('calories', 'Calories', 'kcal')}
      {field('protein', 'Protein', 'g')}
      {field('carbs', 'Carbs', 'g')}
      {field('fiber', 'Fiber', 'g')}
      {field('fat', 'Fat', 'g')}
      {field('saturatedFat', 'Saturated fat', 'g')}
    </View>
  );
}
