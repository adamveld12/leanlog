import { useReducer, useState } from 'react';
import { IngredientList, Tabs, recipes, useAnalytics } from '@leanlog/ui';
import { DraftEntryCard } from './ingredient-entry/DraftEntryCard';
import { ScanTab } from './ingredient-entry/ScanTab';
import { DatabaseTab } from './ingredient-entry/DatabaseTab';
import { entryReducer, initialEntryState, type EntryTab } from './ingredient-entry/entryReducer';
import type {
  AddFromDatabaseInput,
  EntryIngredient,
  IngredientDraft,
} from './ingredient-entry/types';

export type {
  AddFromDatabaseInput,
  EntryIngredient,
  IngredientDraft,
} from './ingredient-entry/types';

type IngredientEntryProps = {
  ingredients: EntryIngredient[];
  onSubmit: (draft: IngredientDraft, editingId: string | null) => void;
  onDelete: (ingredientId: string) => void;
  onAddFromDatabase: (databaseIngredientId: string, input: AddFromDatabaseInput) => Promise<void>;
  showDatabaseCreate?: boolean;
  analyticsContext: 'meal' | 'template';
};

export function IngredientEntry({
  ingredients,
  onSubmit,
  onDelete,
  onAddFromDatabase,
  showDatabaseCreate = false,
  analyticsContext,
}: IngredientEntryProps) {
  const track = useAnalytics();
  const [entry, dispatch] = useReducer(entryReducer, initialEntryState);
  // dbTotal lives here so the database ingredient count survives tab switches.
  const [dbTotal, setDbTotal] = useState<number | null>(null);

  const saveIngredient = () => {
    onSubmit(entry.draft, entry.editingId);
    track(`${analyticsContext}.ingredient.added`, { source: entry.draftSource });
    dispatch({ type: 'reset' });
  };

  return (
    <>
      <IngredientList
        ingredients={ingredients}
        onEdit={(id) => {
          const ingredient = ingredients.find((i) => i.id === id);
          if (ingredient) dispatch({ type: 'editRow', ingredient });
        }}
        onDelete={(id) => {
          onDelete(id);
          track(`${analyticsContext}.ingredient.deleted`, { ingredientId: id });
          if (entry.editingId === id) dispatch({ type: 'reset' });
        }}
      />
      <div className={recipes.stack.lg}>
        <Tabs
          tabs={[
            {
              key: 'database',
              label: 'Nutrition Facts Database',
              panelId: 'ingredient-database-panel',
            },
            { key: 'scan', label: 'Label Scan', panelId: 'ingredient-scan-panel' },
            { key: 'manual', label: 'Manual Entry', panelId: 'ingredient-manual-panel' },
          ]}
          active={entry.tab}
          onChange={(key) => dispatch({ type: 'setTab', tab: key as EntryTab })}
          label="Ingredient entry method"
        />
        <div
          role="tabpanel"
          id={`ingredient-${entry.tab}-panel`}
          aria-labelledby={`ingredient-${entry.tab}-panel-tab`}
        >
          {entry.tab === 'manual' ? (
            <DraftEntryCard
              // Remount per edit target so the micronutrient row keys reseed.
              key={entry.editingId ?? 'new'}
              draft={entry.draft}
              editingId={entry.editingId}
              onChange={(draft) => dispatch({ type: 'patchDraft', draft })}
              onSubmit={saveIngredient}
              onCancel={entry.editingId ? () => dispatch({ type: 'reset' }) : undefined}
            />
          ) : null}
          {entry.tab === 'scan' ? (
            <ScanTab
              draft={entry.draft}
              editingId={entry.editingId}
              draftSource={entry.draftSource}
              analyticsContext={analyticsContext}
              onDraftChange={(draft) => dispatch({ type: 'patchDraft', draft })}
              onApplyScan={(patch) => dispatch({ type: 'applyScan', patch })}
              onSubmit={saveIngredient}
              onCancel={() => dispatch({ type: 'reset' })}
            />
          ) : null}
          {entry.tab === 'database' ? (
            <DatabaseTab
              analyticsContext={analyticsContext}
              showDatabaseCreate={showDatabaseCreate}
              onAddFromDatabase={onAddFromDatabase}
              dbTotal={dbTotal}
              setDbTotal={setDbTotal}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
