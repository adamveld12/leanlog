import { HelperText } from '../atoms/HelperText';
import { ProgressBar } from '../atoms/ProgressBar';
import { SectionHeading } from '../atoms/SectionHeading';
import { UnitText } from '../atoms/UnitText';
import { calorieColor } from './MacroSummaryLine';

export type MacroProgressBlockProps = {
  label: string;
  calories: number;
  calorieTarget: number;
  protein: number;
  proteinTarget: number;
  carbs: number;
  carbsTarget: number;
  fat: number;
  fatTarget: number;
  detail?: string;
};

export function MacroProgressBlock({
  label,
  calories,
  calorieTarget,
  protein,
  proteinTarget,
  carbs,
  carbsTarget,
  fat,
  fatTarget,
  detail,
}: MacroProgressBlockProps) {
  const pct = calorieTarget > 0 ? Math.round((calories / calorieTarget) * 100) : 0;
  const colorStyle = calorieColor(calories, calorieTarget);
  const barColor = colorStyle?.color ?? 'var(--ll-text)';

  return (
    <div className="flex flex-col gap-1.5">
      <SectionHeading as="h4" noMargin>
        {label}
      </SectionHeading>
      <HelperText as="span" style={colorStyle}>
        {calories} / {calorieTarget}
        <UnitText> kcal</UnitText> · {pct}%
      </HelperText>
      <ProgressBar value={calories} max={calorieTarget} color={barColor} />
      <HelperText as="span">
        P {protein}/{proteinTarget}
        <UnitText>g</UnitText> · C {carbs}/{carbsTarget}
        <UnitText>g</UnitText> · F {fat}/{fatTarget}
        <UnitText>g</UnitText>
      </HelperText>
      {detail && <HelperText as="span">{detail}</HelperText>}
    </div>
  );
}
