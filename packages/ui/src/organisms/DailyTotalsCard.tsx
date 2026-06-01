import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { ProgressBar } from '../atoms/ProgressBar';
import { SectionHeading } from '../atoms/SectionHeading';
import { Text } from '../atoms/Text';
import { UnitText } from '../atoms/UnitText';
import { AnalyticsScope } from '../analytics';
import { calorieColor } from '../molecules/MacroSummaryLine';
import { SectionCard } from '../molecules/SectionCard';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

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

        <div className={cn(recipes.stack.row, 'flex-wrap')}>
          <HelperText as="p">
            FAT {fat} / {macroTargets.fat}g
          </HelperText>
          <HelperText as="span">·</HelperText>
          <HelperText as="p">
            PROTEIN {protein} / {macroTargets.protein}g
          </HelperText>
          <HelperText as="span">·</HelperText>
          <HelperText as="p">
            CARBS {netCarbs} net / {carbs} / {macroTargets.carbs}g
          </HelperText>
        </div>
      </SectionCard>
    </AnalyticsScope>
  );
}
