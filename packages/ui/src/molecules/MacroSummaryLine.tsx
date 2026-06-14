import { HelperText } from '../atoms/HelperText';
import { Text } from '../atoms/Text';
import { UnitText } from '../atoms/UnitText';
import { calorieColor } from '../styles/calorieColor';

export type MacroSummaryLineProps = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  calorieTarget?: number;
};

export function MacroSummaryLine({
  calories,
  protein,
  carbs,
  fat,
  calorieTarget,
}: MacroSummaryLineProps) {
  return (
    <HelperText as="span">
      <Text as="span" variant="meta" style={calorieColor(calories, calorieTarget)}>
        {calorieTarget && calorieTarget > 0 ? (
          <>
            {calories} / {calorieTarget}
          </>
        ) : (
          calories
        )}
        <UnitText> kcal</UnitText>
      </Text>{' '}
      · P {protein}
      <UnitText>g</UnitText> · C {carbs}
      <UnitText>g</UnitText> · F {fat}
      <UnitText>g</UnitText>
    </HelperText>
  );
}
