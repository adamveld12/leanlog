import { useState } from 'react';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { ExtraQuickAddForm, type ExtraDraft } from '../molecules/ExtraQuickAddForm';
import { ListRow } from '../molecules/ListRow';
import { MacroSummaryLine } from '../molecules/MacroSummaryLine';
import { SectionCard } from '../molecules/SectionCard';

export type { ExtraDraft };

// Structural display type — packages/ui has no @leanlog/data-access dependency,
// so callers pass their domain ingredient (a structural superset) directly,
// mirroring IngredientListItem.
export type ExtraItem = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type ExtrasCardProps = {
  items: ExtraItem[];
  onAdd: (draft: ExtraDraft) => void;
  onEdit: (id: string, draft: ExtraDraft) => void;
  onDelete: (id: string) => void;
  /** Past days are read-only (#41 R22) — hides add/edit/delete affordances entirely. */
  readOnly?: boolean;
};

export function ExtrasCard({ items, onAdd, onEdit, onDelete, readOnly = false }: ExtrasCardProps) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (readOnly && items.length === 0) return null;

  const editingItem = editingId ? items.find((i) => i.id === editingId) : undefined;

  const closeForm = () => {
    setOpen(false);
    setEditingId(null);
  };

  return (
    <AnalyticsScope properties={{ organism: 'ExtrasCard' }}>
      <SectionCard title="Extras" className="mb-5">
        {items.length ? null : !readOnly ? (
          <HelperText as="p">One-off items like chips or a drink — not a full meal.</HelperText>
        ) : null}

        {items.map((item) => (
          <ListRow
            key={item.id}
            title={item.name}
            // react-doctor-disable-next-line react-doctor/jsx-no-jsx-as-prop
            meta={
              <MacroSummaryLine
                calories={item.calories}
                protein={item.protein}
                carbs={item.carbs}
                fat={item.fat}
              />
            }
            onOpen={
              readOnly
                ? undefined
                : () => {
                    setEditingId(item.id);
                    setOpen(true);
                  }
            }
            actions={
              readOnly ? undefined : (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (editingId === item.id) closeForm();
                    onDelete(item.id);
                  }}
                >
                  Delete
                </Button>
              )
            }
          />
        ))}

        {readOnly ? null : open ? (
          <ExtraQuickAddForm
            initial={editingItem}
            submitLabel={editingId ? 'Save extra' : 'Add extra'}
            autoFocus
            onSubmit={(draft) => {
              if (editingId) onEdit(editingId, draft);
              else onAdd(draft);
              closeForm();
            }}
            onCancel={closeForm}
          />
        ) : (
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              setEditingId(null);
              setOpen(true);
            }}
          >
            + Add extra
          </Button>
        )}
      </SectionCard>
    </AnalyticsScope>
  );
}
