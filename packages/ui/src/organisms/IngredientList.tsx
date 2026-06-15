import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { ListRow } from '../molecules/ListRow';
import { MacroSummaryLine } from '../molecules/MacroSummaryLine';
import { SectionCard } from '../molecules/SectionCard';

// Structural display type — packages/ui has no @leanlog/data-access dependency, so
// callers pass their domain ingredient (a structural superset) directly.
export type IngredientListItem = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type IngredientListProps = {
  ingredients: IngredientListItem[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

export function IngredientList({ ingredients, onEdit, onDelete }: IngredientListProps) {
  return (
    <SectionCard title="Ingredients" className="mb-5">
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
          }
          onOpen={() => onEdit(i.id)}
        />
      ))}
    </SectionCard>
  );
}
