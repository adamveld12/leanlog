import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  Button,
  cn,
  FileInput,
  HelperText,
  IngredientEntryCard,
  LabelScanCard,
  ListRow,
  MacroSummaryLine,
  Modal,
  NutritionDatabaseEntryCard,
  NutritionDatabaseSearchCard,
  recipes,
  ScanReviewModal,
  SectionHeading,
  Tabs,
  WarningText,
  useAnalytics,
} from '@leanlog/ui';
import type {
  LabelScanValue,
  NutritionDatabaseEntryValue,
  NutritionDatabaseSearchResult,
} from '@leanlog/ui';
import { estimateCalories } from '@leanlog/data-access';
import type { Ingredient, ScanResolution, UpsertIngredient } from '@leanlog/data-access';
import { normalizeIngredientName } from '../lib';
import { useStore } from '../state';
import { api } from '../api';
import type { NutritionDatabaseIngredientSearchResult } from '../types';

type DraftNumericKey =
  | 'weight'
  | 'fat'
  | 'saturatedFat'
  | 'carbs'
  | 'fiber'
  | 'protein'
  | 'calories'
  | 'sugarAlcohol'
  | 'allulose'
  | 'alcohol';

export type IngredientDraft = Omit<
  UpsertIngredient,
  'id' | 'mealId' | 'createdAt' | 'updatedAt' | DraftNumericKey
> & { [K in DraftNumericKey]: number | null };

export const emptyDraft: IngredientDraft = {
  name: '',
  weight: null,
  calories: null,
  fat: null,
  saturatedFat: null,
  carbs: null,
  fiber: null,
  protein: null,
  sugarAlcohol: null,
  allulose: null,
  alcohol: null,
};

function mapDbSearchResults(
  raw: NutritionDatabaseIngredientSearchResult[],
): NutritionDatabaseSearchResult[] {
  return raw.map((r) => ({
    id: r.id,
    name: r.name,
    servingAmount: r.servingAmount,
    fat: r.fat,
    carbs: r.carbs,
    protein: r.protein,
    fiber: r.fiber ?? null,
    calories: r.calories,
    addedByName: r.addedByName,
    addedAtLabel: new Date(r.createdAt).toLocaleDateString(),
    creationSource: r.creationSource,
  }));
}

export type EntryIngredient = Omit<Ingredient, 'mealId'>;

type IngredientEntryProps = {
  ingredients: EntryIngredient[];
  onSubmit: (draft: IngredientDraft, editingId: string | null) => void;
  onDelete: (ingredientId: string) => void;
  onAddFromDatabase: (databaseIngredientId: string, measuredAmount: number) => Promise<void>;
  onSaveToDatabase?: (ingredient: EntryIngredient) => void;
  showDatabaseCreate?: boolean;
  savingToDbId?: string | null;
  analyticsContext: 'meal' | 'template';
};

export function IngredientEntry({
  ingredients,
  onSubmit,
  onDelete,
  onAddFromDatabase,
  onSaveToDatabase,
  showDatabaseCreate = false,
  savingToDbId = null,
  analyticsContext,
}: IngredientEntryProps) {
  const { getToken } = useAuth();
  const { searchNutritionDatabase, createNutritionDatabaseIngredient } = useStore();
  const track = useAnalytics();

  const [draft, setDraft] = useState<IngredientDraft>(emptyDraft);
  const [draftSource, setDraftSource] = useState<'manual' | 'scanned'>('manual');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [entryTab, setEntryTab] = useState<'manual' | 'scan' | 'database'>('database');
  const [scanForm, setScanForm] = useState<LabelScanValue>({
    mode: 'weight',
    amount: null,
  });
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanResult, setScanResult] = useState<ScanResolution | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  // Database tab state
  const [dbQuery, setDbQuery] = useState('');
  const [dbResults, setDbResults] = useState<NutritionDatabaseSearchResult[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbSearched, setDbSearched] = useState(false);
  const [dbTotal, setDbTotal] = useState<number | null>(null);
  const [dbAmounts, setDbAmounts] = useState<Record<string, number>>({});
  const [dbAddingId, setDbAddingId] = useState<string | null>(null);
  const [dbShowCreate, setDbShowCreate] = useState(false);
  const [dbEntryValue, setDbEntryValue] = useState<NutritionDatabaseEntryValue>({
    name: '',
    servingAmount: null,
    calories: null,
    fat: null,
    carbs: null,
    protein: null,
  });
  const [dbCreating, setDbCreating] = useState(false);
  const [dbError, setDbError] = useState('');
  const dbSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Seed the database ingredient count when the database tab first opens
  useEffect(() => {
    if (entryTab !== 'database' || dbTotal !== null) return;
    void searchNutritionDatabase('')
      .then(({ total }) => setDbTotal(total))
      .catch(() => {});
  }, [entryTab, dbTotal, searchNutritionDatabase]);

  // Track whenever the database tab is active (initial view and later switches)
  useEffect(() => {
    if (entryTab !== 'database') return;
    track(`${analyticsContext}.ingredient.database.viewed`, {});
  }, [entryTab, track, analyticsContext]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const openCamera = async () => {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      fileInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch {
      setCameraError('Camera unavailable. Falling back to file picker.');
      fileInputRef.current?.click();
    }
  };

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    const onLoadedMetadata = () => {
      void video.play();
    };
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.srcObject = null;
    };
  }, [cameraOpen]);

  const saveIngredient = () => {
    onSubmit(draft, editingId);
    track(`${analyticsContext}.ingredient.added`, { source: draftSource });
    setDraft(emptyDraft);
    setDraftSource('manual');
    setEditingId(null);
  };

  const onScanFile = async (file: File) => {
    setScanError('');
    setCameraError('');
    setScanLoading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const isServings = scanForm.mode === 'servings';
      const isPackage = scanForm.mode === 'package';
      formData.append('mode', isServings ? 'servings' : 'weight');
      formData.append('entirePackage', String(isPackage));
      formData.append(
        'weightGrams',
        scanForm.mode === 'weight' ? String(scanForm.amount ?? '') : '',
      );
      formData.append('servings', isServings ? String(scanForm.amount ?? '') : '');
      formData.append('name', '');
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const result = await api.scanNutrition(token, formData);
      track(`${analyticsContext}.ingredient.scanned`, {});
      setScanResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Scan failed';
      track(`${analyticsContext}.ingredient.scanned.error`, { error: message });
      setScanError(message);
    } finally {
      setScanLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92),
    );
    if (!blob) return;
    stopCamera();
    setCameraOpen(false);
    await onScanFile(new File([blob], 'nutrition.jpg', { type: 'image/jpeg' }));
  };

  const applyScan = (sourceDbId?: string | null) => {
    if (!scanResult || !scanResult.canApply) return;
    const { proposed } = scanResult;
    setDraft((prev) => ({
      ...prev,
      name: proposed.name ?? prev.name,
      weight: proposed.weight,
      calories: proposed.calories > 0 ? proposed.calories : null,
      fat: proposed.fat,
      saturatedFat: proposed.saturatedFat,
      carbs: proposed.carbs,
      fiber: proposed.fiber,
      protein: proposed.protein,
      sugarAlcohol: proposed.sugarAlcohol ?? null,
      allulose: proposed.allulose ?? null,
      // When the scan was also saved to the database, the applied ingredient is
      // born linked so it cannot be saved to the database again.
      sourceDatabaseIngredientId: sourceDbId ?? null,
    }));
    setDraftSource('scanned');
    setScanResult(null);
    setScanForm({ mode: 'weight', amount: null });
  };

  return (
    <>
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
                      onSaveToDatabase(i);
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
                    track(`${analyticsContext}.ingredient.deleted`, { ingredientId: i.id });
                    if (editingId === i.id) {
                      setEditingId(null);
                      setDraft(emptyDraft);
                      setDraftSource('manual');
                    }
                  }}
                >
                  Delete ingredient
                </Button>
              </div>
            }
            onOpen={() => {
              setEditingId(i.id);
              setDraftSource('manual');
              setEntryTab('manual');
              setDraft({
                name: i.name,
                weight: i.weight,
                calories: i.calorieSource === 'explicit' ? i.calories : null,
                fat: i.fat,
                saturatedFat: i.saturatedFat,
                carbs: i.carbs,
                fiber: i.fiber,
                protein: i.protein,
                sugarAlcohol: i.sugarAlcohol ?? null,
                allulose: i.allulose ?? null,
                alcohol: i.alcohol ?? null,
                // Preserve snapshot extras so editing doesn't wipe them on upsert
                unsaturatedFat: i.unsaturatedFat ?? null,
                monounsaturatedFat: i.monounsaturatedFat ?? null,
                polyunsaturatedFat: i.polyunsaturatedFat ?? null,
                transFat: i.transFat ?? null,
                sugar: i.sugar ?? null,
                micronutrients: i.micronutrients ?? null,
                sourceDatabaseIngredientId: i.sourceDatabaseIngredientId ?? null,
              });
            }}
          />
        ))}
      </div>
      <div className={recipes.stack.lg}>
        <Tabs
          tabs={[
            {
              key: 'database',
              label: 'Nutrition Database',
              panelId: 'ingredient-database-panel',
            },
            { key: 'scan', label: 'Label Scan', panelId: 'ingredient-scan-panel' },
            { key: 'manual', label: 'Manual Entry', panelId: 'ingredient-manual-panel' },
          ]}
          active={entryTab}
          onChange={(key) => {
            const next = key as 'manual' | 'scan' | 'database';
            setEntryTab(next);
          }}
          label="Ingredient entry method"
        />
        <div
          role="tabpanel"
          id={`ingredient-${entryTab}-panel`}
          aria-labelledby={`ingredient-${entryTab}-panel-tab`}
        >
          {entryTab === 'manual' ? (
            <IngredientEntryCard
              value={draft}
              estimatedCalories={estimateCalories({
                fat: draft.fat ?? 0,
                carbs: draft.carbs ?? 0,
                protein: draft.protein ?? 0,
                fiber: draft.fiber,
                sugarAlcohol: draft.sugarAlcohol,
                allulose: draft.allulose,
                alcohol: draft.alcohol,
              })}
              submitLabel={editingId ? 'Update' : 'Add'}
              onChange={setDraft}
              onSubmit={saveIngredient}
              onCancel={
                editingId
                  ? () => {
                      setDraft(emptyDraft);
                      setEditingId(null);
                      setDraftSource('manual');
                    }
                  : undefined
              }
              normalizeNameOnBlur={normalizeIngredientName}
            />
          ) : null}
          {entryTab === 'scan' ? (
            <div className={recipes.stack.sm}>
              <LabelScanCard
                value={scanForm}
                loading={scanLoading}
                error={scanError || cameraError}
                onChange={setScanForm}
                onScan={openCamera}
              />
              {draftSource === 'scanned' ? (
                <IngredientEntryCard
                  value={draft}
                  estimatedCalories={estimateCalories({
                    fat: draft.fat ?? 0,
                    carbs: draft.carbs ?? 0,
                    protein: draft.protein ?? 0,
                    fiber: draft.fiber,
                    sugarAlcohol: draft.sugarAlcohol,
                    allulose: draft.allulose,
                    alcohol: draft.alcohol,
                  })}
                  submitLabel={editingId ? 'Update' : 'Add'}
                  onChange={setDraft}
                  onSubmit={saveIngredient}
                  onCancel={() => {
                    setDraft(emptyDraft);
                    setEditingId(null);
                    setDraftSource('manual');
                  }}
                  normalizeNameOnBlur={normalizeIngredientName}
                />
              ) : null}
            </div>
          ) : null}
          {entryTab === 'database' ? (
            <div className={recipes.stack.sm}>
              {dbError ? <WarningText role="alert">{dbError}</WarningText> : null}
              <NutritionDatabaseSearchCard
                query={dbQuery}
                onQueryChange={(q) => {
                  setDbQuery(q);
                  if (dbSearchTimerRef.current) clearTimeout(dbSearchTimerRef.current);
                  if (q.length < 2) {
                    setDbResults([]);
                    setDbSearched(false);
                    return;
                  }
                  dbSearchTimerRef.current = setTimeout(() => {
                    setDbLoading(true);
                    void searchNutritionDatabase(q)
                      .then(({ results, total }) => {
                        setDbResults(mapDbSearchResults(results));
                        setDbTotal(total);
                        setDbSearched(true);
                      })
                      .catch(() => {
                        setDbError('Search failed. Please try again.');
                        setDbSearched(true);
                      })
                      .finally(() => setDbLoading(false));
                  }, 300);
                }}
                results={dbResults}
                loading={dbLoading}
                searched={dbSearched}
                amounts={dbAmounts}
                onAmountChange={(id, amount) =>
                  setDbAmounts((prev) => ({ ...prev, [id]: amount ?? 0 }))
                }
                onAdd={(id) => {
                  const amount = dbAmounts[id] ?? 0;
                  if (amount <= 0) return;
                  setDbAddingId(id);
                  void onAddFromDatabase(id, amount)
                    .then(() => {
                      track(`${analyticsContext}.ingredient.added`, { source: 'database' });
                      setDbAmounts((prev) => {
                        const next = { ...prev };
                        delete next[id];
                        return next;
                      });
                    })
                    .catch(() => {
                      setDbError('Failed to add ingredient. Please try again.');
                    })
                    .finally(() => setDbAddingId(null));
                }}
                addingId={dbAddingId}
                onCreateNew={
                  showDatabaseCreate ? () => setDbShowCreate((prev) => !prev) : undefined
                }
                truncated={dbResults.length >= 25}
                totalCount={dbTotal ?? undefined}
              />
              {showDatabaseCreate && dbShowCreate ? (
                <NutritionDatabaseEntryCard
                  value={dbEntryValue}
                  estimatedCalories={estimateCalories({
                    fat: dbEntryValue.fat ?? 0,
                    carbs: dbEntryValue.carbs ?? 0,
                    protein: dbEntryValue.protein ?? 0,
                    fiber: dbEntryValue.fiber ?? null,
                    sugarAlcohol: dbEntryValue.sugarAlcohol ?? null,
                    allulose: dbEntryValue.allulose ?? null,
                    alcohol: dbEntryValue.alcohol ?? null,
                  })}
                  onChange={setDbEntryValue}
                  submitting={dbCreating}
                  onSubmit={() => {
                    // The card disables Publish until these are filled; this
                    // guard narrows the nullable draft for the strict schema.
                    if (
                      dbEntryValue.servingAmount == null ||
                      dbEntryValue.fat == null ||
                      dbEntryValue.carbs == null ||
                      dbEntryValue.protein == null
                    )
                      return;
                    const resolvedCalories =
                      dbEntryValue.calories ??
                      estimateCalories({
                        fat: dbEntryValue.fat,
                        carbs: dbEntryValue.carbs,
                        protein: dbEntryValue.protein,
                        fiber: dbEntryValue.fiber ?? null,
                        sugarAlcohol: dbEntryValue.sugarAlcohol ?? null,
                        allulose: dbEntryValue.allulose ?? null,
                        alcohol: dbEntryValue.alcohol ?? null,
                      });
                    setDbCreating(true);
                    void createNutritionDatabaseIngredient({
                      ...dbEntryValue,
                      servingAmount: dbEntryValue.servingAmount,
                      fat: dbEntryValue.fat,
                      carbs: dbEntryValue.carbs,
                      protein: dbEntryValue.protein,
                      calories: resolvedCalories,
                      micronutrients: dbEntryValue.micronutrients?.map((m) => ({
                        name: m.name,
                        amount: m.amount ?? undefined,
                        unit: m.unit,
                        percentDailyValue: m.percentDailyValue ?? undefined,
                      })),
                      creationSource: 'manual',
                    })
                      .then(() => {
                        track('nutrition_database.ingredient.published', { source: 'manual' });
                        setDbShowCreate(false);
                        setDbEntryValue({
                          name: '',
                          servingAmount: null,
                          calories: null,
                          fat: null,
                          carbs: null,
                          protein: null,
                        });
                        setDbTotal((t) => (t == null ? t : t + 1));
                        if (dbQuery.length >= 2) {
                          setDbLoading(true);
                          void searchNutritionDatabase(dbQuery)
                            .then(({ results, total }) => {
                              setDbResults(mapDbSearchResults(results));
                              setDbTotal(total);
                            })
                            .catch(() => {})
                            .finally(() => setDbLoading(false));
                        }
                      })
                      .catch(() => {
                        setDbError('Failed to publish ingredient. Please try again.');
                      })
                      .finally(() => setDbCreating(false));
                  }}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <FileInput
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onScanFile(file);
        }}
      />
      <Modal
        open={cameraOpen}
        title="Take nutrition photo"
        onClose={() => {
          stopCamera();
          setCameraOpen(false);
        }}
      >
        <div className={recipes.stack.sm}>
          <video
            ref={videoRef}
            aria-label="Nutrition label viewfinder"
            className={cn(recipes.radius.control, 'w-full border border-[var(--ll-line)]')}
            autoPlay
            playsInline
            muted
          />
          <div className={cn(recipes.stack.row, recipes.stack.between)}>
            <Button
              variant="secondary"
              onClick={() => {
                stopCamera();
                setCameraOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => void capturePhoto()}>Capture</Button>
          </div>
        </div>
      </Modal>
      <ScanReviewModal
        open={!!scanResult}
        onClose={() => {
          setScanResult(null);
        }}
        onAccept={() => applyScan()}
        onRetake={() => {
          setScanResult(null);
          void openCamera();
        }}
        canAccept={scanResult?.canApply ?? false}
        blockReason={scanResult?.blockReason}
        warning={scanResult?.warning}
        notes={scanResult?.notes}
        onSaveToDatabase={
          scanResult && 'databaseCandidate' in scanResult && scanResult.proposed.name
            ? () => {
                const candidate = scanResult.databaseCandidate;
                if (!candidate) return;
                void createNutritionDatabaseIngredient({
                  name: candidate.name,
                  servingAmount: candidate.servingAmount,
                  fat: candidate.fat,
                  carbs: candidate.carbs,
                  protein: candidate.protein,
                  calories: candidate.calories,
                  saturatedFat: candidate.saturatedFat ?? undefined,
                  fiber: candidate.fiber ?? undefined,
                  sugar: candidate.sugar ?? undefined,
                  sugarAlcohol: candidate.sugarAlcohol ?? undefined,
                  allulose: candidate.allulose ?? undefined,
                  creationSource: 'scan',
                })
                  .then((created) => {
                    track('nutrition_database.ingredient.published', { source: 'scan' });
                    setDbTotal((t) => (t == null ? t : t + 1));
                    applyScan(created.id);
                  })
                  .catch(() => {
                    setDbError('Failed to save ingredient to database.');
                  });
              }
            : undefined
        }
        canSaveToDatabase={
          scanResult && 'databaseCandidate' in scanResult
            ? scanResult.databaseCandidate !== null && scanResult.canApply
            : undefined
        }
        saveToDatabaseBlockReason={scanResult?.databaseBlockReason}
        fields={
          scanResult
            ? [
                {
                  label: 'Name',
                  current: draft.name || '—',
                  proposed: scanResult.proposed.name
                    ? `${scanResult.proposed.name} (detected)`
                    : '—',
                },
                {
                  label: 'Weight',
                  current: draft.weight ?? '—',
                  proposed: scanResult.proposed.weight,
                  unit: 'g',
                },
                {
                  label: 'Calories',
                  current: draft.calories != null ? draft.calories : '(will estimate)',
                  proposed: scanResult.proposed.calories,
                },
                {
                  label: 'Fat',
                  current: draft.fat ?? '—',
                  proposed: scanResult.proposed.fat,
                  unit: 'g',
                },
                {
                  label: 'Saturated fat',
                  current: draft.saturatedFat ?? '—',
                  proposed: scanResult.proposed.saturatedFat,
                  unit: 'g',
                },
                {
                  label: 'Carbs',
                  current: draft.carbs ?? '—',
                  proposed: scanResult.proposed.carbs,
                  unit: 'g',
                },
                {
                  label: 'Fiber',
                  current: draft.fiber ?? '—',
                  proposed: scanResult.proposed.fiber,
                  unit: 'g',
                },
                {
                  label: 'Protein',
                  current: draft.protein ?? '—',
                  proposed: scanResult.proposed.protein,
                  unit: 'g',
                },
              ]
            : []
        }
      />
    </>
  );
}
