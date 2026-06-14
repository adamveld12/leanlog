import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { ProgressBar } from '../atoms/ProgressBar';
import { SectionHeading } from '../atoms/SectionHeading';
import { Text } from '../atoms/Text';
import { UnitText } from '../atoms/UnitText';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { calorieColor } from '../styles/calorieColor';
import { SectionCard } from '../molecules/SectionCard';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';
import { targetProgressColor } from '../styles/targetProgress';

export type DailyTotalsCardProps = {
  calories: number;
  calorieTarget: number;
  fat: number;
  protein: number;
  carbs: number;
  fiber: number;
  macroTargets: { fat: number; protein: number; carbs: number };
  onUpdateTargets?: () => void;
};

export function DailyTotalsCard({
  calories,
  calorieTarget,
  fat,
  protein,
  carbs,
  fiber,
  macroTargets,
  onUpdateTargets,
}: DailyTotalsCardProps) {
  const calorieStyle = calorieColor(calories, calorieTarget);
  const netCarbs = Math.max(0, Math.round(carbs - fiber));

  return (
    <AnalyticsScope properties={{ organism: 'DailyTotalsCard' }}>
      <SectionCard>
        <div className={cn(recipes.stack.row, recipes.stack.between)}>
          <SectionHeading noMargin>Daily totals</SectionHeading>
          {onUpdateTargets ? (
            <Button variant="ghost" size="sm" onClick={onUpdateTargets}>
              Update targets
            </Button>
          ) : null}
        </div>

        <Text as="p" variant="pageSubtitle" style={calorieStyle}>
          {calorieTarget > 0 ? (
            <>
              {calories} / {calorieTarget}
            </>
          ) : (
            calories
          )}
          <UnitText> kcal</UnitText>
        </Text>

        <ProgressBar
          value={calories}
          max={calorieTarget || 1}
          color={calorieStyle?.color as string}
        />

        <div className={cn(recipes.stack.xs)}>
          <div className={cn(recipes.stack.row, recipes.stack.between)}>
            <HelperText as="span">Protein</HelperText>
            <HelperText as="span">
              {protein} / {macroTargets.protein}
              <UnitText>g</UnitText>
            </HelperText>
          </div>
          <ProgressBar
            value={protein}
            max={macroTargets.protein || 1}
            color={targetProgressColor(protein, macroTargets.protein)}
            aria-label="Protein progress"
            aria-valuetext={`${protein} of ${macroTargets.protein}g`}
          />
        </div>

        <div className={cn(recipes.stack.xs)}>
          <div className={cn(recipes.stack.row, recipes.stack.between)}>
            <HelperText as="span">Net Carbs</HelperText>
            <HelperText as="span">
              {netCarbs} net / {carbs} total / {macroTargets.carbs}
              <UnitText>g</UnitText>
            </HelperText>
          </div>
          <ProgressBar
            value={netCarbs}
            max={macroTargets.carbs || 1}
            color={targetProgressColor(netCarbs, macroTargets.carbs)}
            aria-label="Net carbs progress"
            aria-valuetext={`${netCarbs} net of ${macroTargets.carbs}g`}
          />
        </div>

        <div className={cn(recipes.stack.xs)}>
          <div className={cn(recipes.stack.row, recipes.stack.between)}>
            <HelperText as="span">Fat</HelperText>
            <HelperText as="span">
              {fat} / {macroTargets.fat}
              <UnitText>g</UnitText>
            </HelperText>
          </div>
          <ProgressBar
            value={fat}
            max={macroTargets.fat || 1}
            color={targetProgressColor(fat, macroTargets.fat)}
            aria-label="Fat progress"
            aria-valuetext={`${fat} of ${macroTargets.fat}g`}
          />
        </div>
      </SectionCard>
    </AnalyticsScope>
  );
}
