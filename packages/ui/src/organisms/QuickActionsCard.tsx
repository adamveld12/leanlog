import { useState } from 'react';
import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { ExtraQuickAddForm, type ExtraDraft } from '../molecules/ExtraQuickAddForm';
import { MacroProgressBlock, type MacroProgressBlockProps } from '../molecules/MacroProgressBlock';
import { SectionCard } from '../molecules/SectionCard';
import { recipes } from '../styles/recipes';

export type QuickActionsCardProps = {
  hasToday: boolean;
  hasDays: boolean;
  today?: Omit<MacroProgressBlockProps, 'label'>;
  week?: Omit<MacroProgressBlockProps, 'label'>;
  weekDayCount?: number;
  onAction: () => void;
  // A shortcut to the goal covering today (mode + end date), linking to Goals.
  activeGoal?: { summary: string; onOpen: () => void };
  // A shortcut to the plans list, which has no top-level nav entry (#84).
  onOpenPlans?: () => void;
  // Submits a quick-added extra for today, creating the day first if missing
  // (#64 R9/R10) — no navigation; the card handles its own inline form.
  // Omitted hides the "Log an extra" affordance entirely.
  onAddExtra?: (draft: ExtraDraft) => void;
};

export function QuickActionsCard({
  hasToday,
  hasDays,
  today,
  week,
  weekDayCount,
  onAction,
  activeGoal,
  onOpenPlans,
  onAddExtra,
}: QuickActionsCardProps) {
  const [addingExtra, setAddingExtra] = useState(false);

  return (
    <AnalyticsScope properties={{ organism: 'QuickActionsCard' }}>
      <SectionCard title="Quick Actions">
        <Button onClick={onAction} className="w-full">
          Log a meal
        </Button>

        {onAddExtra ? (
          addingExtra ? (
            <ExtraQuickAddForm
              submitLabel="Add extra"
              autoFocus
              onCancel={() => setAddingExtra(false)}
              onSubmit={(draft) => {
                setAddingExtra(false);
                onAddExtra(draft);
              }}
            />
          ) : (
            <Button variant="secondary" onClick={() => setAddingExtra(true)} className="w-full">
              Log an extra
            </Button>
          )
        ) : null}

        {activeGoal ? (
          <Button variant="subtle" fullWidth onClick={activeGoal.onOpen}>
            {activeGoal.summary}
          </Button>
        ) : null}

        {onOpenPlans ? (
          <Button variant="subtle" fullWidth onClick={onOpenPlans}>
            📋 Meal Planning
          </Button>
        ) : null}

        {!hasDays ? (
          <HelperText as="p" className="text-center">
            Start tracking your meals to see daily and weekly macro progress here.
          </HelperText>
        ) : (
          <div className={recipes.stack.lg}>
            {hasToday && today ? (
              <MacroProgressBlock label="Today" {...today} />
            ) : (
              <HelperText as="p">No entry for today</HelperText>
            )}

            {week && (
              <MacroProgressBlock
                label="This Week (Mon-Sun)"
                {...week}
                detail={weekDayCount != null ? `${weekDayCount} days tracked` : undefined}
              />
            )}
          </div>
        )}
      </SectionCard>
    </AnalyticsScope>
  );
}
