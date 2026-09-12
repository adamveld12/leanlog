import { useEffect, useReducer, useRef, useState } from 'react';
import posthog from 'posthog-js';
import { NutritionDatabaseSearchCard, WarningText, recipes, useAnalytics } from '@leanlog/ui';
import { useStore } from '../../state';
import { dbReducer, initialDbState } from '../ingredient-entry/dbReducer';
import { mapDbSearchResults, type AddFromDatabaseInput } from '../ingredient-entry/types';

// Where this search is mounted, for analytics. 'day' is the Day detail Extras
// card; 'track' is the Track screen's inline "Log an extra" quick action.
export type ExtraSearchSurface = 'day' | 'track';

export type ExtraDatabaseSearchProps = {
  surface: ExtraSearchSurface;
  /** Adds the chosen entry to the day's Extras bucket, scaled server-side. */
  onAdd: (databaseIngredientId: string, input: AddFromDatabaseInput) => Promise<void>;
};

// Two characters before we hit the API, then a 300ms idle — same thresholds as
// the in-meal database tab, so both surfaces feel identical (#93 R2).
const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 300;

// Database lookup for the Extras flow (#93). Deliberately renders the search
// card WITHOUT onScanLabel/onCreateNew: label scanning and entry creation are
// the stated non-goals, so they are absent by construction rather than behind a
// flag that could be flipped on by accident.
export function ExtraDatabaseSearch({ surface, onAdd }: ExtraDatabaseSearchProps) {
  const { searchNutritionDatabase } = useStore();
  const track = useAnalytics();
  const [db, dispatch] = useReducer(dbReducer, initialDbState);
  const [total, setTotal] = useState<number | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    track('extra.database.viewed', { surface });
  }, [track, surface]);

  // Seed the catalog count so the search label reads "N ingredients available".
  useEffect(() => {
    void searchNutritionDatabase('')
      .then(({ total: count }) => setTotal(count))
      .catch(() => {});
  }, [searchNutritionDatabase]);

  // Drop a pending search when the panel unmounts. Reading searchTimerRef.current
  // in the cleanup is the point, not a bug: we want to clear whichever timer is
  // pending at unmount, which is by definition the latest one. Capturing it at
  // effect-setup time would always clear null.
  // react-doctor-disable-next-line react-doctor/exhaustive-deps
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const runSearch = (query: string) => {
    dispatch({ type: 'searchStart' });
    void searchNutritionDatabase(query)
      .then(({ results, total: count }) => {
        dispatch({ type: 'searchSucceeded', results: mapDbSearchResults(results) });
        setTotal(count);
        // Zero-result queries are the signal for catalog gaps.
        track('extra.database.searched', { surface, resultCount: results.length });
      })
      .catch((e: unknown) => {
        dispatch({ type: 'searchFailed' });
        posthog.captureException(e, { context: 'extra_database_search' });
      });
  };

  return (
    <div className={recipes.stack.sm}>
      {db.error ? <WarningText role="alert">{db.error}</WarningText> : null}
      <NutritionDatabaseSearchCard
        embedded
        // A packaged snack is the common case for an Extra, so one serving is
        // prefilled and Add is usable on the first tap (#93 R4).
        defaultMode="servings"
        defaultAmount={1}
        query={db.query}
        onQueryChange={(q) => {
          dispatch({ type: 'setQuery', query: q });
          if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
          if (q.length < MIN_QUERY_LENGTH) {
            dispatch({ type: 'clearResults' });
            return;
          }
          searchTimerRef.current = setTimeout(() => runSearch(q), SEARCH_DEBOUNCE_MS);
        }}
        results={db.results}
        loading={db.loading}
        searched={db.searched}
        amounts={db.amounts}
        onAmountChange={(id, amount) => dispatch({ type: 'setAmount', id, amount: amount ?? 0 })}
        modes={db.modes}
        onModeChange={(id, mode) => dispatch({ type: 'setMode', id, mode })}
        onAdd={(id) => {
          const mode = db.modes[id] ?? 'servings';
          const amount = db.amounts[id] ?? 1;
          if (mode !== 'package' && amount <= 0) return;
          const input: AddFromDatabaseInput = mode === 'package' ? { mode } : { mode, amount };
          dispatch({ type: 'addStart', id });
          // Distinguish seeded USDA foods from user-created entries so we can
          // measure whether the preseed gets used from Extras (#72).
          const provenance =
            db.results.find((r) => r.id === id)?.creationSource === 'usda' ? 'usda' : 'user';
          void onAdd(id, input)
            .then(() => {
              track('extra.added', { source: 'database', mode, provenance, surface });
              // The panel deliberately stays open so several items can be
              // logged in a row (#93 R8).
              dispatch({ type: 'addSucceeded', id });
            })
            .catch((e: unknown) => {
              dispatch({ type: 'addFailed' });
              track('extra.database.add.error', { surface });
              posthog.captureException(e, { context: 'extra_database_add' });
            });
        }}
        addingId={db.addingId}
        truncated={db.results.length >= 25}
        totalCount={total ?? undefined}
      />
    </div>
  );
}
