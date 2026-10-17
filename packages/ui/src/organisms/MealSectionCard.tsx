import { useEffect, useEffectEvent, useId, type ReactNode } from 'react';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { HelperText } from '../atoms/HelperText';
import { SectionHeading } from '../atoms/SectionHeading';
import { WarningText } from '../atoms/WarningText';
import { ListRow } from '../molecules/ListRow';
import { MacroSummaryLine } from '../molecules/MacroSummaryLine';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

// Structural display type — packages/ui has no @leanlog/data-access dependency.
export type MealSectionItem = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Only the section's own food can be changed; food shown here from other
   *  meals (Extras, full-mode plan meals) is read-only. */
  editable: boolean;
};

export type MealSectionTotals = { calories: number; protein: number; carbs: number; fat: number };

export type MealSectionCardProps = {
  title: string;
  items: MealSectionItem[];
  totals: MealSectionTotals;
  onAdd?: () => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  /** Past days in Stats: food is shown, nothing can be changed. */
  readOnly?: boolean;
  /** Shown above the add button when opening the section failed. */
  error?: string;
  /** Inline add (#102): the card grows in place to show `entry`, and the add
   *  button becomes Done. */
  expanded?: boolean;
  /** The app-supplied entry form shown while expanded (an organism may not
   *  render the app's entry flow itself). Keep it set while collapsing so the
   *  close animates; clear it from `onCollapsed`. */
  entry?: ReactNode;
  onDone?: () => void;
  /** Fires once the collapse animation has finished. */
  onCollapsed?: () => void;
};

// Matches recipes.expand's 350ms plus a little slack for the last frame.
const COLLAPSE_MS = 400;

// One fixed meal section of simple mode's notebook-style day (#102):
// Breakfast, Lunch, Dinner or Snacks with its food and an add button.
export function MealSectionCard({
  title,
  items,
  totals,
  onAdd,
  onEdit,
  onDelete,
  readOnly = false,
  error,
  expanded = false,
  entry,
  onDone,
  onCollapsed,
}: MealSectionCardProps) {
  const headingId = useId();
  const hasEntry = entry != null;
  const collapsed = useEffectEvent(() => onCollapsed?.());

  // A timer rather than transitionend: it also fires under reduced motion,
  // where there is no transition to end.
  useEffect(() => {
    if (expanded || !hasEntry) return;
    const timer = setTimeout(collapsed, COLLAPSE_MS);
    return () => clearTimeout(timer);
  }, [expanded, hasEntry]);
  return (
    <AnalyticsScope properties={{ organism: 'MealSectionCard', section: title }}>
      <Card aria-labelledby={headingId}>
        <div className={recipes.stack.sm}>
          <div className={recipes.stack.rowBetween}>
            <SectionHeading noMargin id={headingId}>
              {title}
            </SectionHeading>
            <HelperText data-testid="section-calories">
              {Math.round(totals.calories)} kcal
            </HelperText>
          </div>

          {items.length === 0 ? <HelperText as="p">Nothing yet</HelperText> : null}

          {items.map((item) => {
            const canChange = !readOnly && item.editable;
            return (
              <ListRow
                key={item.id}
                title={item.name}
                // react-doctor-disable-next-line react-doctor/jsx-no-jsx-as-prop
                meta={
                  <MacroSummaryLine
                    calories={Math.round(item.calories)}
                    protein={Math.round(item.protein)}
                    carbs={Math.round(item.carbs)}
                    fat={Math.round(item.fat)}
                  />
                }
                onOpen={canChange && onEdit ? () => onEdit(item.id) : undefined}
                actions={
                  canChange && onDelete ? (
                    <Button
                      size="sm"
                      variant="danger"
                      aria-label={`Delete ${item.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                      }}
                    >
                      Delete
                    </Button>
                  ) : undefined
                }
              />
            );
          })}

          {hasEntry ? (
            <div
              data-testid="section-entry"
              className={cn(
                recipes.expand.base,
                expanded ? recipes.expand.open : recipes.expand.closed,
              )}
              aria-hidden={!expanded}
              inert={!expanded}
            >
              <div className={recipes.expand.inner}>{entry}</div>
            </div>
          ) : null}

          {error ? <WarningText>{error}</WarningText> : null}

          {readOnly ? null : expanded ? (
            <Button fullWidth aria-label={`Done adding to ${title}`} onClick={onDone}>
              Done
            </Button>
          ) : onAdd ? (
            <Button
              variant="secondary"
              fullWidth
              aria-label={`Add food to ${title}`}
              onClick={onAdd}
            >
              + Add food
            </Button>
          ) : null}
        </div>
      </Card>
    </AnalyticsScope>
  );
}
