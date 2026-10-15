import { useId } from 'react';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { HelperText } from '../atoms/HelperText';
import { SectionHeading } from '../atoms/SectionHeading';
import { WarningText } from '../atoms/WarningText';
import { ListRow } from '../molecules/ListRow';
import { MacroSummaryLine } from '../molecules/MacroSummaryLine';
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
};

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
}: MealSectionCardProps) {
  const headingId = useId();
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

          {error ? <WarningText>{error}</WarningText> : null}

          {!readOnly && onAdd ? (
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
