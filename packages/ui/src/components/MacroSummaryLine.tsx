import type { CSSProperties } from 'react';

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
    <span className="ll-meta">
      <span style={calorieColor(calories, calorieTarget)}>
        {calorieTarget && calorieTarget > 0 ? (
          <>
            {calories} / {calorieTarget}
          </>
        ) : (
          calories
        )}
        <span className="ll-unit"> kcal</span>
      </span>{' '}
      · P {protein}
      <span className="ll-unit">g</span> · C {carbs}
      <span className="ll-unit">g</span> · F {fat}
      <span className="ll-unit">g</span>
    </span>
  );
}
