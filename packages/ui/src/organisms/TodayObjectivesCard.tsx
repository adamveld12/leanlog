import type { ReactNode } from 'react';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { ProgressBar } from '../atoms/ProgressBar';
import { SuccessText } from '../atoms/SuccessText';
import { Text } from '../atoms/Text';
import { UnitText } from '../atoms/UnitText';
import { SectionCard } from '../molecules/SectionCard';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

export type ObjectiveMacroRow = { actual: number; target: number; complete: boolean };

// Plain data only: packages/ui has no dependency on data-access, so the page
// maps dayObjectives() onto these props (as BodyTrackingCard does for v-taper).
export type TodayObjectivesCardProps = {
  weight: { complete: boolean; weightLbs: number | null; onLogWeight: () => void };
  meals: { complete: boolean; eaten: number; target: number; onNextMeal: () => void };
  macros: {
    complete: boolean;
    protein: ObjectiveMacroRow;
    carbs: ObjectiveMacroRow;
    fat: ObjectiveMacroRow;
    // Context only — calories never gate completion, so no bar and no status.
    calories: ObjectiveMacroRow;
  };
  allComplete: boolean;
  /** Local-time label of the first completion, e.g. "8:42pm". */
  completedAtLabel?: string;
};

const WEIGHT_TIP =
  'Weigh immediately upon waking, after peeing, before eating or drinking, and ideally naked.';

// Green check / red x (#37 R4). role="img" + a label so the state isn't carried
// by colour or glyph alone.
function StatusMark({ label, complete }: { label: string; complete: boolean }) {
  return (
    <Text
      role="img"
      aria-label={`${label} ${complete ? 'completed' : 'incomplete'}`}
      variant={complete ? 'tracked' : 'missed'}
    >
      {complete ? '✓' : '✕'}
    </Text>
  );
}

function ObjectiveRow({
  label,
  complete,
  detail,
  children,
}: {
  label: string;
  complete: boolean;
  detail?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={recipes.stack.sm}>
      <div className={recipes.stack.rowBetween}>
        <div className={recipes.stack.row}>
          <StatusMark label={label} complete={complete} />
          <Text variant="subheading">{label}</Text>
        </div>
        {detail}
      </div>
      {children}
    </div>
  );
}

// The bar reflects the ±10% rule the objective is judged by, not the looser
// goal-adherence colouring: green in range, red once clearly over, else neutral.
function macroBarColor({ actual, target, complete }: ObjectiveMacroRow): string {
  if (complete) return 'var(--ll-saved)';
  return actual > target ? 'var(--ll-danger)' : 'var(--ll-text)';
}

function MacroRow({ label, row }: { label: string; row: ObjectiveMacroRow }) {
  return (
    <div className={recipes.stack.xs}>
      <div className={recipes.stack.rowBetween}>
        <HelperText as="span">{label}</HelperText>
        <HelperText as="span">
          {Math.round(row.actual)} / {Math.round(row.target)}
          <UnitText>g</UnitText>
        </HelperText>
      </div>
      <ProgressBar
        value={row.actual}
        max={row.target || 1}
        color={macroBarColor(row)}
        aria-label={`${label} progress`}
        aria-valuetext={`${Math.round(row.actual)} of ${Math.round(row.target)}g`}
      />
    </div>
  );
}

// One primary CTA at a time, in urgency order: weight first, then the next
// meal. While weight is outstanding the meal CTA stays available but secondary.
export function TodayObjectivesCard({
  weight,
  meals,
  macros,
  allComplete,
  completedAtLabel,
}: TodayObjectivesCardProps) {
  const completedCount = [weight.complete, meals.complete, macros.complete].filter(Boolean).length;

  return (
    <AnalyticsScope properties={{ organism: 'TodayObjectivesCard' }}>
      <SectionCard title="Today's objectives">
        {allComplete ? (
          <div className={recipes.stack.xs}>
            <Text as="p" variant="subheading">
              🎉 All objectives complete!
            </Text>
            <SuccessText>
              Nice work — you closed today out
              {completedAtLabel ? ` at ${completedAtLabel}` : ''}.
            </SuccessText>
          </div>
        ) : (
          <HelperText as="p">{completedCount} of 3 complete</HelperText>
        )}

        <ObjectiveRow
          label="Weight"
          complete={weight.complete}
          detail={
            weight.complete && weight.weightLbs != null ? (
              <Text variant="meta">{weight.weightLbs} lbs</Text>
            ) : undefined
          }
        >
          {weight.complete ? null : (
            <>
              <HelperText as="p">{WEIGHT_TIP}</HelperText>
              <Button fullWidth analyticsName="objectives-log-weight" onClick={weight.onLogWeight}>
                Log today’s weight
              </Button>
            </>
          )}
        </ObjectiveRow>

        <div className="border-t border-[var(--ll-line)]" />

        <ObjectiveRow
          label="Meals"
          complete={meals.complete}
          detail={
            <HelperText as="span">
              {meals.eaten} / {meals.target}
            </HelperText>
          }
        >
          <ProgressBar
            value={meals.eaten}
            max={meals.target || 1}
            color={meals.complete ? 'var(--ll-saved)' : 'var(--ll-text)'}
            aria-label="Meals progress"
            aria-valuetext={`${meals.eaten} of ${meals.target} meals`}
          />
          {meals.complete ? null : (
            <Button
              fullWidth
              variant={weight.complete ? 'primary' : 'secondary'}
              analyticsName="objectives-next-meal"
              onClick={meals.onNextMeal}
            >
              Log meal {meals.eaten + 1} of {meals.target}
            </Button>
          )}
        </ObjectiveRow>

        <div className="border-t border-[var(--ll-line)]" />

        <ObjectiveRow label="Macros" complete={macros.complete}>
          <div className={cn(recipes.stack.sm)}>
            <MacroRow label="Protein" row={macros.protein} />
            <MacroRow label="Carbs" row={macros.carbs} />
            <MacroRow label="Fat" row={macros.fat} />
            <HelperText as="p">
              Calories {Math.round(macros.calories.actual)} / {Math.round(macros.calories.target)}
              <UnitText> kcal</UnitText>
            </HelperText>
          </div>
        </ObjectiveRow>
      </SectionCard>
    </AnalyticsScope>
  );
}
