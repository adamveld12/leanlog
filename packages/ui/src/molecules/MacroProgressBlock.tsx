import { HelperText } from '../atoms/HelperText';
import { ProgressBar } from '../atoms/ProgressBar';
import { SectionHeading } from '../atoms/SectionHeading';
import { UnitText } from '../atoms/UnitText';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';
import { targetProgressColor } from '../styles/targetProgress';
import { calorieColor } from '../styles/calorieColor';

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
  fiber: number;
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
  fiber,
  detail,
}: MacroProgressBlockProps) {
  const pct = calorieTarget > 0 ? Math.round((calories / calorieTarget) * 100) : 0;
  const colorStyle = calorieColor(calories, calorieTarget);
  const barColor = colorStyle?.color ?? 'var(--ll-text)';
  const netCarbs = Math.max(0, Math.round(carbs - fiber));

  return (
    <div className={cn(recipes.stack.xs)}>
      <SectionHeading as="h4" noMargin>
        {label}
      </SectionHeading>
      <HelperText as="span" style={colorStyle}>
        {calories} / {calorieTarget}
        <UnitText> kcal</UnitText> · {pct}%
      </HelperText>
      <ProgressBar value={calories} max={calorieTarget} color={barColor} />

      <div className={cn(recipes.stack.xs)}>
        <div className={cn(recipes.stack.row, recipes.stack.between)}>
          <HelperText as="span">Protein</HelperText>
          <HelperText as="span">
            {protein} / {proteinTarget}
            <UnitText>g</UnitText>
          </HelperText>
        </div>
        <ProgressBar
          value={protein}
          max={proteinTarget || 1}
          color={targetProgressColor(protein, proteinTarget)}
          aria-label="Protein progress"
          aria-valuetext={`${protein} of ${proteinTarget}g`}
        />
      </div>

      <div className={cn(recipes.stack.xs)}>
        <div className={cn(recipes.stack.row, recipes.stack.between)}>
          <HelperText as="span">Carbs</HelperText>
          <HelperText as="span">
            {carbs} / {carbsTarget}
            <UnitText>g</UnitText> · {netCarbs} net
          </HelperText>
        </div>
        <ProgressBar
          value={carbs}
          max={carbsTarget || 1}
          color={targetProgressColor(carbs, carbsTarget)}
          aria-label="Carbs progress"
          aria-valuetext={`${carbs} of ${carbsTarget}g`}
        />
      </div>

      <div className={cn(recipes.stack.xs)}>
        <div className={cn(recipes.stack.row, recipes.stack.between)}>
          <HelperText as="span">Fat</HelperText>
          <HelperText as="span">
            {fat} / {fatTarget}
            <UnitText>g</UnitText>
          </HelperText>
        </div>
        <ProgressBar
          value={fat}
          max={fatTarget || 1}
          color={targetProgressColor(fat, fatTarget)}
          aria-label="Fat progress"
          aria-valuetext={`${fat} of ${fatTarget}g`}
        />
      </div>

      {detail && <HelperText as="span">{detail}</HelperText>}
    </div>
  );
}
