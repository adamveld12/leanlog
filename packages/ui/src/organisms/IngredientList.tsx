import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { SectionHeading } from '../atoms/SectionHeading';
import { ListRow } from '../molecules/ListRow';
import { MacroSummaryLine } from '../molecules/MacroSummaryLine';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

// Structural display type — packages/ui has no @leanlog/data-access dependency, so
// callers pass their domain ingredient (a structural superset) directly.
export type IngredientListItem = {
  id: string;
  name: string;
  weight: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sourceDatabaseIngredientId?: string | null;
};

export type IngredientListProps = {
  ingredients: IngredientListItem[];
  savingToDbId?: string | null;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveToDatabase?: (id: string) => void;
};

export function IngredientList({
  ingredients,
  savingToDbId = null,
  onEdit,
  onDelete,
  onSaveToDatabase,
}: IngredientListProps) {
  return (
    <div className={cn(recipes.stack.sm, 'mb-5')}>
      <SectionHeading as="h4" noMargin>
        Ingredients
      </SectionHeading>
      <HelperText as="p">Tap an ingredient row to edit values.</HelperText>
      {ingredients.length ? null : <HelperText as="p">No items</HelperText>}
      {ingredients.map((i) => (
        <ListRow
          key={i.id}
          title={i.name}
          // Slot prop: ListRow renders this node in its meta region (intentional template
          // composition, not a new-element-every-render hazard).
          // react-doctor-disable-next-line react-doctor/jsx-no-jsx-as-prop
          meta={
            <MacroSummaryLine
              calories={i.calories}
              protein={i.protein}
              carbs={i.carbs}
              fat={i.fat}
            />
          }
          actions={
            <div className={cn(recipes.stack.row, 'flex-wrap')}>
              {onSaveToDatabase && !i.sourceDatabaseIngredientId ? (
                <Button
                  size="sm"
                  variant="primary"
                  disabled={i.weight <= 0 || savingToDbId === i.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSaveToDatabase(i.id);
                  }}
                >
                  {savingToDbId === i.id ? 'Saving…' : 'Save to database'}
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(i.id);
                }}
              >
                Delete ingredient
              </Button>
            </div>
          }
          onOpen={() => onEdit(i.id)}
        />
      ))}
    </div>
  );
}
