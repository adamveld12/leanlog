import { Fragment, useState, type ReactNode } from 'react';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { Text } from '../atoms/Text';
import { MacroSummaryLine } from '../molecules/MacroSummaryLine';
import { SectionCard } from '../molecules/SectionCard';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

export type WeekDayRow = {
  key: string;
  label: string;
  /** False for a date with no log — shown as "Not logged" and not expandable. */
  logged: boolean;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  weightLbs: number | null;
  /** What was eaten, shown when the row is expanded (read-only). */
  details?: ReactNode;
};

export type WeekDayTotalsCardProps = {
  title?: string;
  average: { calories: number; protein: number; carbs: number; fat: number };
  rows: WeekDayRow[];
  onExpand?: (key: string) => void;
};

// Simple mode's Stats page (#102): one row per day of the trailing week with the
// per-day average on top. Tapping a logged day expands it to show its food.
export function WeekDayTotalsCard({
  title = 'Last 7 days',
  average,
  rows,
  onExpand,
}: WeekDayTotalsCardProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <AnalyticsScope properties={{ organism: 'WeekDayTotalsCard' }}>
      <SectionCard title={title}>
        <div data-testid="week-average" className={recipes.stack.row}>
          <HelperText>Avg / day</HelperText>
          <MacroSummaryLine
            calories={Math.round(average.calories)}
            protein={Math.round(average.protein)}
            carbs={Math.round(average.carbs)}
            fat={Math.round(average.fat)}
          />
        </div>

        <div className="border-t border-[var(--ll-line)]" />

        {rows.map((row) => {
          if (!row.logged) {
            return (
              <div key={row.key} className={cn(recipes.stack.rowBetween, 'min-h-[44px] px-1.5')}>
                <Text>{row.label}</Text>
                <HelperText>Not logged</HelperText>
              </div>
            );
          }
          const isOpen = expanded === row.key;
          return (
            <Fragment key={row.key}>
              <Button
                variant="ghost"
                fullWidth
                aria-expanded={isOpen}
                className="justify-between"
                onClick={() => {
                  setExpanded(isOpen ? null : row.key);
                  if (!isOpen) onExpand?.(row.key);
                }}
              >
                <Text>{row.label}</Text>
                <Text variant="meta">
                  {Math.round(row.calories)} kcal
                  {row.weightLbs != null ? ` · ${row.weightLbs} lbs` : ''} {isOpen ? '▾' : '▸'}
                </Text>
              </Button>
              {isOpen ? (
                <div className={cn(recipes.stack.sm, 'pl-1.5')}>
                  <MacroSummaryLine
                    calories={Math.round(row.calories)}
                    protein={Math.round(row.protein)}
                    carbs={Math.round(row.carbs)}
                    fat={Math.round(row.fat)}
                  />
                  {row.details}
                </div>
              ) : null}
            </Fragment>
          );
        })}
      </SectionCard>
    </AnalyticsScope>
  );
}
