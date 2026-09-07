import { useCallback, useState } from 'react';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Button } from '../atoms/Button';
import { Field } from '../atoms/Field';
import { HelperText } from '../atoms/HelperText';
import { Input } from '../atoms/Input';
import { NumberInput } from '../atoms/NumberInput';
import { ListRow } from '../molecules/ListRow';
import { MacroSummaryLine } from '../molecules/MacroSummaryLine';
import { SectionCard } from '../molecules/SectionCard';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

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

export type ExtraDraft = {
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
};

export type ExtrasCardProps = {
  items: ExtraItem[];
  onAdd: (draft: ExtraDraft) => void;
  onEdit: (id: string, draft: ExtraDraft) => void;
  onDelete: (id: string) => void;
  /** Past days are read-only (#41 R22) — hides add/edit/delete affordances entirely. */
  readOnly?: boolean;
  /** Opens the add form (focused) on mount — the Track quick-action entry point (R10). */
  autoOpen?: boolean;
};

type FormState = {
  editingId: string | null;
  name: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  macrosExpanded: boolean;
};

const emptyForm: FormState = {
  editingId: null,
  name: '',
  calories: null,
  protein: null,
  carbs: null,
  fat: null,
  macrosExpanded: false,
};

function formFromItem(item: ExtraItem): FormState {
  return {
    editingId: item.id,
    name: item.name,
    calories: item.calories,
    protein: item.protein || null,
    carbs: item.carbs || null,
    fat: item.fat || null,
    macrosExpanded: item.protein > 0 || item.carbs > 0 || item.fat > 0,
  };
}

export function ExtrasCard({
  items,
  onAdd,
  onEdit,
  onDelete,
  readOnly = false,
  autoOpen = false,
}: ExtrasCardProps) {
  // autoOpen is a one-shot mount-time signal from the Track quick-action
  // (R10), not a live prop to track — the caller remounts this component
  // (fresh route/key) rather than flipping autoOpen on an existing instance.
  const [open, setOpen] = useState(autoOpen);
  const [form, setForm] = useState<FormState>(emptyForm);
  // Focuses the name field the instant it mounts open, with no extra render
  // or effect — a plain callback ref runs exactly when the node appears.
  const nameInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      if (node && autoOpen) node.focus();
    },
    [autoOpen],
  );

  if (readOnly && items.length === 0) return null;

  const canSubmit = form.name.trim().length > 0 && form.calories != null;

  const closeForm = () => {
    setOpen(false);
    setForm(emptyForm);
  };

  const submit = () => {
    if (!canSubmit) return;
    const draft: ExtraDraft = {
      name: form.name.trim(),
      calories: form.calories!,
      protein: form.protein ?? undefined,
      carbs: form.carbs ?? undefined,
      fat: form.fat ?? undefined,
    };
    if (form.editingId) onEdit(form.editingId, draft);
    else onAdd(draft);
    closeForm();
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
                    setForm(formFromItem(item));
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
                    if (form.editingId === item.id) closeForm();
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
          <div className={cn(recipes.stack.sm)}>
            <div className={cn(recipes.grid.two)}>
              <Field label="Name">
                <Input
                  ref={nameInputRef}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </Field>
              <NumberInput
                label="Calories"
                value={form.calories}
                onChange={(calories) => setForm((f) => ({ ...f, calories }))}
              />
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setForm((f) => ({ ...f, macrosExpanded: !f.macrosExpanded }))}
            >
              {form.macrosExpanded ? '- Hide macros' : '+ Add macros'}
            </Button>

            {form.macrosExpanded ? (
              <div className={cn(recipes.grid.three)}>
                <NumberInput
                  label="Protein (g)"
                  value={form.protein}
                  onChange={(protein) => setForm((f) => ({ ...f, protein }))}
                />
                <NumberInput
                  label="Carbs (g)"
                  value={form.carbs}
                  onChange={(carbs) => setForm((f) => ({ ...f, carbs }))}
                />
                <NumberInput
                  label="Fat (g)"
                  value={form.fat}
                  onChange={(fat) => setForm((f) => ({ ...f, fat }))}
                />
              </div>
            ) : null}

            <div className={cn(recipes.stack.row)}>
              <Button className="flex-1" disabled={!canSubmit} onClick={submit}>
                {form.editingId ? 'Save' : 'Add extra'}
              </Button>
              <Button variant="secondary" onClick={closeForm}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              setForm(emptyForm);
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
