import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { AnalyticsScope } from '../analytics';
import { MacroProgressBlock, type MacroProgressBlockProps } from '../molecules/MacroProgressBlock';
import { SectionCard } from '../molecules/SectionCard';

export type QuickActionsCardProps = {
  hasToday: boolean;
  hasDays: boolean;
  today?: Omit<MacroProgressBlockProps, 'label'>;
  week?: Omit<MacroProgressBlockProps, 'label'>;
  weekDayCount?: number;
  onAction: () => void;
};

export function QuickActionsCard({
  hasToday,
  hasDays,
  today,
  week,
  weekDayCount,
  onAction,
}: QuickActionsCardProps) {
  return (
    <AnalyticsScope properties={{ organism: 'QuickActionsCard' }}>
      <SectionCard title="Quick Actions">
        <Button onClick={onAction} className="w-full">
          + {hasToday ? 'Add Meal' : 'Start Today'}
        </Button>

        {!hasDays ? (
          <HelperText as="p" className="mt-2 text-center">
            Start tracking your meals to see daily and weekly macro progress here.
          </HelperText>
        ) : (
          <div className="mt-3 flex flex-col gap-4">
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
