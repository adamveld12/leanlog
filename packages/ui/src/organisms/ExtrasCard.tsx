import { useState, type ReactNode } from 'react';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { ExtraQuickAddForm, type ExtraDraft } from '../molecules/ExtraQuickAddForm';
import { ListRow } from '../molecules/ListRow';
import { Tabs } from '../molecules/Tabs';
import { MacroSummaryLine } from '../molecules/MacroSummaryLine';
import { SectionCard } from '../molecules/SectionCard';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

export type { ExtraDraft };

type ExtrasTab = 'database' | 'manual';

const EXTRAS_DATABASE_PANEL = 'extras-database-panel';
const EXTRAS_MANUAL_PANEL = 'extras-manual-panel';

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
  /** Nutrition database search for the add flow (#93). Supplied by the app,
   *  which owns the search organism — an organism may not render another.
   *  When omitted the add flow is the manual quick-add alone, as before. */
  databaseSearch?: ReactNode;
};

export function ExtrasCard({
  items,
  onAdd,
  onEdit,
  onDelete,
  readOnly = false,
  databaseSearch,
}: ExtrasCardProps) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Manual stays the default so the existing quick-add path costs no extra taps
  // (#93 R1). Editing an existing extra is always manual — there is nothing to
  // look up — so the tabs only appear when adding.
  const [tab, setTab] = useState<ExtrasTab>('manual');

  if (readOnly && items.length === 0) return null;

  const editingItem = editingId ? items.find((i) => i.id === editingId) : undefined;

  const closeForm = () => {
    setOpen(false);
    setEditingId(null);
    setTab('manual');
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
          <div className={cn(recipes.stack.sm)}>
            {databaseSearch && !editingId ? (
              <Tabs
                tabs={[
                  { key: 'database', label: 'Search database', panelId: EXTRAS_DATABASE_PANEL },
                  { key: 'manual', label: 'Manual', panelId: EXTRAS_MANUAL_PANEL },
                ]}
                active={tab}
                onChange={(key) => setTab(key as ExtrasTab)}
                label="Extra entry method"
              />
            ) : null}
            <div
              role="tabpanel"
              id={tab === 'database' ? EXTRAS_DATABASE_PANEL : EXTRAS_MANUAL_PANEL}
              aria-labelledby={`${tab === 'database' ? EXTRAS_DATABASE_PANEL : EXTRAS_MANUAL_PANEL}-tab`}
            >
              {databaseSearch && !editingId && tab === 'database' ? (
                databaseSearch
              ) : (
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
              )}
            </div>
            {/* The database panel adds on its own and deliberately stays open so
                several items can be logged in a row (#93 R8), so it needs its
                own way out. */}
            {databaseSearch && !editingId && tab === 'database' ? (
              <Button variant="secondary" fullWidth onClick={closeForm}>
                Cancel
              </Button>
            ) : null}
          </div>
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
