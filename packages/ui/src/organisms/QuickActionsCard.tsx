import { useState, type ReactNode } from 'react';
import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { ExtraQuickAddForm, type ExtraDraft } from '../molecules/ExtraQuickAddForm';
import { MacroProgressBlock, type MacroProgressBlockProps } from '../molecules/MacroProgressBlock';
import { SectionCard } from '../molecules/SectionCard';
import { Tabs } from '../molecules/Tabs';
import { recipes } from '../styles/recipes';

type QuickExtraTab = 'database' | 'manual';

const QUICK_DATABASE_PANEL = 'quick-extra-database-panel';
const QUICK_MANUAL_PANEL = 'quick-extra-manual-panel';

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
  /** Nutrition database search for the inline extra flow (#93), supplied by the
   *  app for the same tier reason as ExtrasCard's. Ignored without onAddExtra. */
  extraDatabaseSearch?: ReactNode;
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
  extraDatabaseSearch,
}: QuickActionsCardProps) {
  const [addingExtra, setAddingExtra] = useState(false);
  // Manual first, matching ExtrasCard (#93 R1).
  const [extraTab, setExtraTab] = useState<QuickExtraTab>('manual');

  const closeExtraForm = () => {
    setAddingExtra(false);
    setExtraTab('manual');
  };

  return (
    <AnalyticsScope properties={{ organism: 'QuickActionsCard' }}>
      <SectionCard title="Quick Actions">
        <Button onClick={onAction} className="w-full">
          Log a meal
        </Button>

        {onAddExtra ? (
          addingExtra ? (
            <div className={recipes.stack.sm}>
              {extraDatabaseSearch ? (
                <Tabs
                  tabs={[
                    { key: 'database', label: 'Search database', panelId: QUICK_DATABASE_PANEL },
                    { key: 'manual', label: 'Manual', panelId: QUICK_MANUAL_PANEL },
                  ]}
                  active={extraTab}
                  onChange={(key) => setExtraTab(key as QuickExtraTab)}
                  label="Extra entry method"
                />
              ) : null}
              <div
                role="tabpanel"
                id={extraTab === 'database' ? QUICK_DATABASE_PANEL : QUICK_MANUAL_PANEL}
                aria-labelledby={`${extraTab === 'database' ? QUICK_DATABASE_PANEL : QUICK_MANUAL_PANEL}-tab`}
              >
                {extraDatabaseSearch && extraTab === 'database' ? (
                  extraDatabaseSearch
                ) : (
                  <ExtraQuickAddForm
                    submitLabel="Add extra"
                    autoFocus
                    onCancel={closeExtraForm}
                    onSubmit={(draft) => {
                      closeExtraForm();
                      onAddExtra(draft);
                    }}
                  />
                )}
              </div>
              {/* The database panel stays open across adds (#93 R8). */}
              {extraDatabaseSearch && extraTab === 'database' ? (
                <Button variant="secondary" fullWidth onClick={closeExtraForm}>
                  Cancel
                </Button>
              ) : null}
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setAddingExtra(true)} fullWidth>
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
