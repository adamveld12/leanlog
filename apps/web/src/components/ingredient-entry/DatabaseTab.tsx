import { useEffect, useReducer, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  CameraCaptureModal,
  FileInput,
  NutritionDatabaseSearchCard,
  WarningText,
  recipes,
  useAnalytics,
} from '@leanlog/ui';
import type { ScanResolution } from '@leanlog/data-access';
import { useStore } from '../../state';
import { api } from '../../api';
import { optimizeImage } from '../../image';
import { dbReducer, initialDbState } from './dbReducer';
import { DatabaseLabelForm } from './DatabaseLabelForm';
import { useDatabaseScan } from './useDatabaseScan';
import { mapDbSearchResults, type AddFromDatabaseInput } from './types';

export type DatabaseTabProps = {
  analyticsContext: 'meal' | 'template';
  showDatabaseCreate: boolean;
  onAddFromDatabase: (databaseIngredientId: string, input: AddFromDatabaseInput) => Promise<void>;
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
  const { getToken } = useAuth();
  const track = useAnalytics();
  const [db, dispatch] = useReducer(dbReducer, initialDbState);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Whether the open label form was populated by a scan or typed manually; drives
  // the published label's creationSource and is read during render to set it.
  const [entrySource, setEntrySource] = useState<'manual' | 'scan'>('manual');
  // Surfaced photo upload error (kept separate from db.error so a failed photo
  // upload doesn't tear down the open create form, #54).
  const [photoError, setPhotoError] = useState<string | null>(null);
  // Bumped after a label scan to trigger the guided, skippable front-photo
  // capture step in the create form (Q4).
  const [guidedFrontSignal, setGuidedFrontSignal] = useState(0);

  // Seed the database ingredient count the first time the tab is shown. dbTotal lives in the
  // parent so it survives tab switches, mirroring the original guard.
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

  // Stage a strict scan into the label form. Always prefills from the best-effort
  // draft — even when not save-ready — so the user can fill the gaps; the form
  // highlights what's missing. Only a fully unreadable label shows an error.
  const stageScan = (result: ScanResolution) => {
    setEntrySource('scan');
    const draft = result.labelDraft;
    if (!draft) {
      dispatch({
        type: 'scanUnreadable',
        error:
          result.databaseBlockReason ?? 'Could not read the label. Retake the photo and try again.',
      });
      track('nutrition_facts.label.scan.blocked', {
        reason: result.databaseBlockReason ?? 'unreadable',
      });
      return;
    }
    dispatch({
      type: 'stageScan',
      value: {
        name: draft.name ?? '',
        servingAmount: draft.servingAmount,
        servingSizeUnit: draft.servingSizeUnit,
        servingSizeDisplayText: draft.servingSizeDisplayText ?? null,
        servingsPerPackage: draft.servingsPerPackage,
        calories: draft.calories,
        fat: draft.fat,
        carbs: draft.carbs,
        protein: draft.protein,
        saturatedFat: draft.saturatedFat ?? null,
        fiber: draft.fiber ?? null,
        sugar: draft.sugar ?? null,
        addedSugars: draft.addedSugars ?? null,
        sugarAlcohol: draft.sugarAlcohol ?? null,
        allulose: draft.allulose ?? null,
        micronutrients: draft.micronutrients?.map((m) => ({
          name: m.name,
          amount: m.amount,
          unit: m.unit,
        })),
      },
    });
    if (!result.databaseCandidate) {
      track('nutrition_facts.label.scan.blocked', {
        reason: result.databaseBlockReason ?? 'incomplete',
      });
    }
    // The label frame is being uploaded as the label photo (see onCapturedImage);
    // now prompt the optional, skippable front-of-package photo (Q4).
    setGuidedFrontSignal((n) => n + 1);
  };

  const {
    scanning,
    cameraOpen,
    fileInputRef,
    videoRef,
    openCamera,
    capturePhoto,
    cancelCamera,
    onFileSelected,
  } = useDatabaseScan({
    analyticsContext,
    onResult: stageScan,
    onError: (error) => dispatch({ type: 'scanUnreadable', error }),
    // The scanned label frame also becomes the entry's label photo: optimize and
    // upload it, then stage the key into the (create) form (#54). Fire-and-forget
    // and best-effort — a failed photo upload must not block label creation.
    onCapturedImage: (image) => {
      void (async () => {
        try {
          const optimized = await optimizeImage(image);
          const token = await getToken();
          if (!token) return;
          const { key } = await api.nutritionDatabase.uploadImage(token, optimized);
          dispatch({ type: 'stageScanPhoto', slot: 'label', key });
        } catch {
          // Non-blocking: the user can still add the photo manually in the form.
        }
      })();
    },
  });

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
        modes={db.modes}
        onModeChange={(id, mode) => dispatch({ type: 'setMode', id, mode })}
        onAdd={(id) => {
          const mode = db.modes[id] ?? 'weight';
          const amount = db.amounts[id] ?? 0;
          if (mode !== 'package' && amount <= 0) return;
          const input: AddFromDatabaseInput = mode === 'package' ? { mode } : { mode, amount };
          dispatch({ type: 'addStart', id });
          // Distinguish seeded USDA foods from user-created entries so we can
          // measure whether the preseed actually gets used (#72).
          const provenance =
            db.results.find((r) => r.id === id)?.creationSource === 'usda' ? 'usda' : 'user';
          void onAddFromDatabase(id, input)
            .then(() => {
              track(`${analyticsContext}.ingredient.added`, { source: 'label', mode, provenance });
              dispatch({ type: 'addSucceeded', id });
            })
            .catch(() => dispatch({ type: 'addFailed' }));
        }}
        addingId={db.addingId}
        scanning={scanning}
        onScanLabel={
          showDatabaseCreate
            ? () => {
                // Close any open manual form immediately; the result re-opens it.
                dispatch({ type: 'closeCreate' });
                setPhotoError(null);
                void openCamera();
              }
            : undefined
        }
        onCreateNew={
          showDatabaseCreate
            ? () => {
                setEntrySource('manual');
                setPhotoError(null);
                dispatch({ type: 'toggleCreate' });
              }
            : undefined
        }
        truncated={db.results.length >= 25}
        totalCount={dbTotal ?? undefined}
      />
      {showDatabaseCreate && db.showCreate ? (
        <DatabaseLabelForm
          value={db.entryValue}
          submitting={db.creating}
          source={entrySource}
          photoError={photoError}
          onPhotoError={setPhotoError}
          // The embedded create flow never edits an existing entry, so photo
          // changes always stage into the publish payload (#54). The guided
          // front-photo prompt fires after each label scan (Q4).
          guidedFrontPromptSignal={guidedFrontSignal}
          onChange={(value) => dispatch({ type: 'setEntryValue', value })}
          onPublish={(payload) => {
            const source = payload.creationSource;
            dispatch({ type: 'createStart' });
            void createNutritionDatabaseIngredient(payload)
              .then(() => {
                track('nutrition_facts.label.published', { source });
                dispatch({ type: 'createSucceeded' });
                setEntrySource('manual');
                setPhotoError(null);
                setDbTotal((t) => (t == null ? t : t + 1));
                if (db.query.length >= 2) runSearch(db.query);
              })
              .catch(() => dispatch({ type: 'createFailed' }));
          }}
        />
      ) : null}
      <FileInput
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
        }}
      />
      <CameraCaptureModal
        open={cameraOpen}
        videoRef={videoRef}
        onCapture={() => void capturePhoto()}
        onCancel={cancelCamera}
      />
    </div>
  );
}
