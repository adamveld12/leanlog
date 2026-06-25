import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import {
  AnalyticsScope,
  APP_NAV_LINKS,
  Button,
  CameraCaptureModal,
  FileInput,
  Modal,
  NutritionDatabaseSearchCard,
  NutritionFactsDatabaseTemplate,
  recipes,
  Text,
  useAnalytics,
  WarningText,
} from '@leanlog/ui';
import { type ScanResolution, type NutritionDatabaseIngredient } from '@leanlog/data-access';
import { DatabaseLabelForm } from '../components/ingredient-entry/DatabaseLabelForm';
import { useDatabaseScan } from '../components/ingredient-entry/useDatabaseScan';
import { mapDbSearchResults } from '../components/ingredient-entry/types';
import { api } from '../api';
import { optimizeImage } from '../image';
import {
  nutritionFactsReducer,
  initialNutritionFactsState,
  labelToEntryValue,
  NUTRITION_FACTS_PAGE_SIZE,
} from '../components/nutrition-facts/nutritionFactsReducer';
import { useStore } from '../state';
import type { NutritionDatabaseIngredientSearchResult } from '../types';
import { HeaderControls, renderRouterNavLink } from './_shared';

// Modal-confirmed delete for a database label (Q1: never window.confirm). Named
// component so the page body stays small and React keeps its identity.
function DeleteLabelModal({
  open,
  onConfirm,
  onClose,
}: {
  open: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} title="Delete label?" onClose={onClose}>
      <Text as="p">
        This permanently removes the saved label from the database. Ingredients already logged from
        it keep their values.
      </Text>
      <div className={recipes.stack.row}>
        <Button variant="danger" onClick={onConfirm}>
          Delete
        </Button>
        <Button variant="subtle" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}

export default function NutritionFactsDatabasePage() {
  const {
    browseNutritionDatabase,
    searchNutritionDatabase,
    createNutritionDatabaseIngredient,
    updateNutritionDatabaseIngredient,
    updateNutritionDatabasePhotos,
    deleteNutritionDatabaseIngredient,
  } = useStore();
  const { user } = useUser();
  const { getToken } = useAuth();
  const track = useAnalytics();
  const [state, dispatch] = useReducer(nutritionFactsReducer, initialNutritionFactsState);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didInit = useRef(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [photosBusy, setPhotosBusy] = useState(false);
  // Bumped after a readable scan to trigger the guided skippable front-photo
  // capture in the create form (#54, Q4).
  const [guidedFrontSignal, setGuidedFrontSignal] = useState(0);

  const currentUserId = user?.id ?? null;
  const currentUserName = user?.fullName ?? 'You';

  // Build a search-result record (the row shape the catalog list renders) from a
  // saved label returned by the store. The label is the current user's, so the
  // attribution name is theirs.
  const toResult = useCallback(
    (label: NutritionDatabaseIngredient): NutritionDatabaseIngredientSearchResult => ({
      ...label,
      addedByName: currentUserName,
    }),
    [currentUserName],
  );

  const runBrowse = useCallback(
    (offset: number, append: boolean) => {
      dispatch({ type: 'browseStart' });
      void browseNutritionDatabase({ limit: NUTRITION_FACTS_PAGE_SIZE, offset })
        .then(({ results, total }) =>
          dispatch({ type: 'browseSucceeded', records: results, total, append }),
        )
        .catch(() => dispatch({ type: 'browseFailed' }));
    },
    [browseNutritionDatabase],
  );

  // Browse the catalog once on first mount. The store methods are recreated each
  // render, so a ref guard (not the dep array) is what keeps this to one fetch.
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    track('nutrition_facts.page.viewed', {});
    runBrowse(0, false);
  }, [track, runBrowse]);

  const onQueryChange = (q: string) => {
    const wasSearching = state.query.trim().length >= 2;
    dispatch({ type: 'setQuery', query: q });
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (q.trim().length < 2) {
      // Leaving search mode: restore the full browse list from the top.
      if (wasSearching) runBrowse(0, false);
      return;
    }
    searchTimerRef.current = setTimeout(() => {
      dispatch({ type: 'searchStart' });
      void searchNutritionDatabase(q)
        .then(({ results, total }) =>
          dispatch({ type: 'searchSucceeded', records: results, total }),
        )
        .catch(() => dispatch({ type: 'searchFailed' }));
    }, 300);
  };

  // Stage a strict scan into the create form (always prefills from the best-effort
  // draft so the user can fill gaps; the form highlights what's missing).
  const stageScan = (result: ScanResolution) => {
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
    analyticsContext: 'database',
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

  const performDelete = (id: string) => {
    setConfirmDeleteId(null);
    dispatch({ type: 'deleteStart', id });
    void deleteNutritionDatabaseIngredient(id)
      .then(() => {
        track('nutrition_facts.label.deleted', {});
        dispatch({ type: 'deleteSucceeded', id });
      })
      .catch(() => dispatch({ type: 'deleteFailed' }));
  };

  // Persist a photo slot change for the entry currently open in the edit form.
  // The macro form's Save preserves photos, so capturing/removing a photo here
  // commits immediately via the dedicated photos endpoint (#54).
  const persistPhoto = (slot: 'product' | 'label', key: string | null) => {
    if (!state.editingId) return;
    setPhotosBusy(true);
    const patch = slot === 'product' ? { productPhotoKey: key } : { labelPhotoKey: key };
    void updateNutritionDatabasePhotos(state.editingId, patch)
      .then((label) => {
        track('nutrition_facts.photo.updated', { slot, cleared: key == null });
        dispatch({ type: 'photosUpdated', record: toResult(label) });
      })
      .catch(() => dispatch({ type: 'submitFailed' }))
      .finally(() => setPhotosBusy(false));
  };

  const ownedBy = (id: string) =>
    state.records.find((r) => r.id === id)?.addedByUserId === currentUserId;

  return (
    <AnalyticsScope properties={{ page: 'NutritionFactsDatabase' }}>
      <NutritionFactsDatabaseTemplate
        heading={{
          title: 'Nutrition Facts Database',
          backHref: '/track',
          navLinks: APP_NAV_LINKS,
          renderNavLink: renderRouterNavLink,
          rightContent: <HeaderControls />,
        }}
      >
        {state.error ? <WarningText role="alert">{state.error}</WarningText> : null}
        <NutritionDatabaseSearchCard
          query={state.query}
          onQueryChange={onQueryChange}
          results={mapDbSearchResults(state.records)}
          loading={state.loading}
          searched={state.searched}
          onEdit={(id) => {
            const rec = state.records.find((r) => r.id === id);
            if (rec) dispatch({ type: 'openEdit', id, value: labelToEntryValue(rec) });
          }}
          onDelete={(id) => setConfirmDeleteId(id)}
          canManage={ownedBy}
          deletingId={state.deletingId}
          onScanLabel={() => {
            dispatch({ type: 'closeForm' });
            void openCamera();
          }}
          onCreateNew={() => dispatch({ type: 'openCreate' })}
          onLoadMore={
            state.hasMore && state.query.trim().length < 2
              ? () => runBrowse(state.offset, true)
              : undefined
          }
          scanning={scanning}
          totalCount={state.total ?? undefined}
        />
        {state.formOpen ? (
          <DatabaseLabelForm
            value={state.entryValue}
            submitting={state.submitting}
            source={state.entrySource}
            submitLabel={state.editingId ? 'Save' : 'Publish'}
            photosBusy={photosBusy}
            // Guided front-photo prompt only applies to the scan-driven create flow.
            guidedFrontPromptSignal={state.editingId ? undefined : guidedFrontSignal}
            // Edit mode persists photo changes immediately; create mode stages
            // them into the publish payload (#54).
            onPhotoChange={state.editingId ? persistPhoto : undefined}
            onPhotoError={(error) => dispatch({ type: 'scanUnreadable', error })}
            onChange={(value) => dispatch({ type: 'setEntryValue', value })}
            onPublish={(payload) => {
              dispatch({ type: 'submitStart' });
              if (state.editingId) {
                // creationSource is immutable on edit; drop it so the strict
                // update schema accepts the payload.
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { creationSource, ...editable } = payload;
                void updateNutritionDatabaseIngredient(state.editingId, editable)
                  .then((label) => {
                    track('nutrition_facts.label.edited', {});
                    dispatch({ type: 'updateSucceeded', record: toResult(label) });
                  })
                  .catch(() => dispatch({ type: 'submitFailed' }));
              } else {
                void createNutritionDatabaseIngredient(payload)
                  .then((label) => {
                    track('nutrition_facts.label.published', { source: payload.creationSource });
                    dispatch({ type: 'createSucceeded', record: toResult(label) });
                  })
                  .catch(() => dispatch({ type: 'submitFailed' }));
              }
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
        <DeleteLabelModal
          open={confirmDeleteId != null}
          onConfirm={() => {
            if (confirmDeleteId) performDelete(confirmDeleteId);
          }}
          onClose={() => setConfirmDeleteId(null)}
        />
      </NutritionFactsDatabaseTemplate>
    </AnalyticsScope>
  );
}
