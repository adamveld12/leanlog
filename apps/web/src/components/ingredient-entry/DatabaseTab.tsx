import { useEffect, useReducer, useRef, type Dispatch, type SetStateAction } from 'react';
import {
  NutritionDatabaseEntryCard,
  NutritionDatabaseSearchCard,
  WarningText,
  recipes,
  useAnalytics,
} from '@leanlog/ui';
import { estimateCalories } from '@leanlog/data-access';
import { useStore } from '../../state';
import { dbReducer, initialDbState } from './dbReducer';
import { mapDbSearchResults } from './types';

export type DatabaseTabProps = {
  analyticsContext: 'meal' | 'template';
  showDatabaseCreate: boolean;
  onAddFromDatabase: (databaseIngredientId: string, measuredAmount: number) => Promise<void>;
  dbTotal: number | null;
  setDbTotal: Dispatch<SetStateAction<number | null>>;
};

export function DatabaseTab({
  analyticsContext,
  showDatabaseCreate,
  onAddFromDatabase,
  dbTotal,
  setDbTotal,
}: DatabaseTabProps) {
  const { searchNutritionDatabase, createNutritionDatabaseIngredient } = useStore();
  const track = useAnalytics();
  const [db, dispatch] = useReducer(dbReducer, initialDbState);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Seed the database ingredient count the first time the tab is shown. dbTotal lives in the
  // parent so it survives tab switches (and scan-publish bumps), mirroring the original guard.
  useEffect(() => {
    if (dbTotal !== null) return;
    void searchNutritionDatabase('')
      .then(({ total }) => setDbTotal(total))
      .catch(() => {});
  }, [dbTotal, setDbTotal, searchNutritionDatabase]);

  // Fires on each mount, i.e. each time the database tab becomes active.
  useEffect(() => {
    track(`${analyticsContext}.ingredient.database.viewed`, {});
  }, [track, analyticsContext]);

  const runSearch = (query: string) => {
    dispatch({ type: 'searchStart' });
    void searchNutritionDatabase(query)
      .then(({ results, total }) => {
        dispatch({ type: 'searchSucceeded', results: mapDbSearchResults(results) });
        setDbTotal(total);
      })
      .catch(() => dispatch({ type: 'searchFailed' }));
  };

  const { entryValue } = db;

  return (
    <div className={recipes.stack.sm}>
      {db.error ? <WarningText role="alert">{db.error}</WarningText> : null}
      <NutritionDatabaseSearchCard
        query={db.query}
        onQueryChange={(q) => {
          dispatch({ type: 'setQuery', query: q });
          if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
          if (q.length < 2) {
            dispatch({ type: 'clearResults' });
            return;
          }
          searchTimerRef.current = setTimeout(() => runSearch(q), 300);
        }}
        results={db.results}
        loading={db.loading}
        searched={db.searched}
        amounts={db.amounts}
        onAmountChange={(id, amount) => dispatch({ type: 'setAmount', id, amount: amount ?? 0 })}
        onAdd={(id) => {
          const amount = db.amounts[id] ?? 0;
          if (amount <= 0) return;
          dispatch({ type: 'addStart', id });
          void onAddFromDatabase(id, amount)
            .then(() => {
              track(`${analyticsContext}.ingredient.added`, { source: 'database' });
              dispatch({ type: 'addSucceeded', id });
            })
            .catch(() => dispatch({ type: 'addFailed' }));
        }}
        addingId={db.addingId}
        onCreateNew={showDatabaseCreate ? () => dispatch({ type: 'toggleCreate' }) : undefined}
        truncated={db.results.length >= 25}
        totalCount={dbTotal ?? undefined}
      />
      {showDatabaseCreate && db.showCreate ? (
        <NutritionDatabaseEntryCard
          value={entryValue}
          estimatedCalories={estimateCalories({
            fat: entryValue.fat ?? 0,
            carbs: entryValue.carbs ?? 0,
            protein: entryValue.protein ?? 0,
            fiber: entryValue.fiber ?? null,
            sugarAlcohol: entryValue.sugarAlcohol ?? null,
            allulose: entryValue.allulose ?? null,
            alcohol: entryValue.alcohol ?? null,
          })}
          onChange={(value) => dispatch({ type: 'setEntryValue', value })}
          submitting={db.creating}
          onSubmit={() => {
            // The card disables Publish until these are filled; this guard narrows the
            // nullable draft for the strict schema.
            if (
              entryValue.servingAmount == null ||
              entryValue.fat == null ||
              entryValue.carbs == null ||
              entryValue.protein == null
            )
              return;
            const resolvedCalories =
              entryValue.calories ??
              estimateCalories({
                fat: entryValue.fat,
                carbs: entryValue.carbs,
                protein: entryValue.protein,
                fiber: entryValue.fiber ?? null,
                sugarAlcohol: entryValue.sugarAlcohol ?? null,
                allulose: entryValue.allulose ?? null,
                alcohol: entryValue.alcohol ?? null,
              });
            dispatch({ type: 'createStart' });
            void createNutritionDatabaseIngredient({
              ...entryValue,
              servingAmount: entryValue.servingAmount,
              fat: entryValue.fat,
              carbs: entryValue.carbs,
              protein: entryValue.protein,
              calories: resolvedCalories,
              micronutrients: entryValue.micronutrients?.map((m) => ({
                name: m.name,
                amount: m.amount ?? undefined,
                unit: m.unit,
                percentDailyValue: m.percentDailyValue ?? undefined,
              })),
              creationSource: 'manual',
            })
              .then(() => {
                track('nutrition_database.ingredient.published', { source: 'manual' });
                dispatch({ type: 'createSucceeded' });
                setDbTotal((t) => (t == null ? t : t + 1));
                if (db.query.length >= 2) runSearch(db.query);
              })
              .catch(() => dispatch({ type: 'createFailed' }));
          }}
        />
      ) : null}
    </div>
  );
}
