import type { CSSProperties } from 'react';
import { HelperText } from '../atoms/HelperText';
import { UnitText } from '../atoms/UnitText';

export type MacroSummaryLineProps = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  calorieTarget?: number;
};

function calorieColor(calories: number, calorieTarget?: number): CSSProperties | undefined {
  if (!calorieTarget || calorieTarget <= 0) return undefined;
  const pctDiff = Math.abs(calories - calorieTarget) / calorieTarget;
  const color =
    pctDiff <= 0.05 ? 'var(--ll-saved)' : pctDiff <= 0.15 ? 'var(--ll-warn)' : 'var(--ll-danger)';
  return { color };
}

export function MacroSummaryLine({
  calories,
  protein,
  carbs,
  fat,
  calorieTarget,
}: MacroSummaryLineProps) {
  return (
    <HelperText as="span">
      <span style={calorieColor(calories, calorieTarget)}>
        {calorieTarget && calorieTarget > 0 ? (
          <>
            {calories} / {calorieTarget}
          </>
        ) : (
          calories
        )}
        <UnitText> kcal</UnitText>
      </span>{' '}
      · P {protein}
      <UnitText>g</UnitText> · C {carbs}
      <UnitText>g</UnitText> · F {fat}
      <UnitText>g</UnitText>
    </HelperText>
  );
}
