import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import {
  BodyInfoCard,
  Button,
  CalorieTargetCard,
  DateSelect3,
  IngredientEntryCard,
  Input,
  ListSectionCard,
  MacroTargetsCard,
  Modal,
  NumberInput,
  ProgressBar,
  SectionCard,
  SwipeRow,
} from '@leanlog/ui';
import { normalizeIngredientName, prettyDate, round1 } from './lib';
import { dayTotals, mealTotals } from './selectors';
import { migrateState, useStore } from './state';
import { parseProfile, PROFILE_KEY, type Profile } from './profile';
import type { DayTargets, Ingredient, SaveSections } from './types';

type IngredientDraft = Omit<Ingredient, 'id'>;

type NutritionScanResult = {
  proposed: {
    name?: string;
    weight: number;
    calories: number;
    fat: number;
    saturatedFat: number;
    carbs: number;
    fiber: number;
    protein: number;
  };
  canApply: boolean;
  blockReason?: string;
  notes: string[];
};

const emptyDraft: IngredientDraft = {
  name: '',
  weight: 0,
  calories: 0,
  fat: 0,
  saturatedFat: 0,
  carbs: 0,
  fiber: 0,
  protein: 0,
};

function useSavedSections() {
  const [saved, setSaved] = useState<SaveSections>({});
  const markSaved = (key: keyof SaveSections) => setSaved((s) => ({ ...s, [key]: true }));
  const markDirty = (key: keyof SaveSections) => setSaved((s) => ({ ...s, [key]: false }));
  return { saved, markSaved, markDirty };
}

function calorieFromMode(weightLbs: number, mode: Profile['calorieTarget']['mode']) {
  if (weightLbs < 90) return null;
  const x = mode === 'deficit' ? 10 : mode === 'maintenance' ? 15 : 16;
  return Math.ceil(weightLbs * x);
}

function targetCaloriesFromProfile(profile: Profile) {
  if (profile.calorieTarget.mode === 'custom') return profile.calorieTarget.targetCalories ?? 0;
  return calorieFromMode(profile.bodyInfo.weightLbs, profile.calorieTarget.mode) ?? 0;
}

function dayTargetsFromProfile(profile: Profile): DayTargets {
  const calories = targetCaloriesFromProfile(profile);
  if (profile.macroTargets.mode === 'custom') {
    return {
      calories,
      macros: {
        fat: Math.round(profile.macroTargets.fats),
        carbs: Math.round(profile.macroTargets.carbs),
        protein: Math.round(profile.macroTargets.protein),
      },
    };
  }
  return {
    calories,
    macros: {
      fat: Math.round((calories * (profile.macroTargets.fats / 100)) / 9),
      carbs: Math.round((calories * (profile.macroTargets.carbs / 100)) / 4),
      protein: Math.round((calories * (profile.macroTargets.protein / 100)) / 4),
    },
  };
}

function AppHeader({ title, backTo }: { title: string; backTo?: string }) {
  return (
    <div className="ll-row ll-between">
      <div className="ll-row">
        {backTo ? (
          <Link className="ll-btn ll-btn-sm ll-btn-subtle" to={backTo}>
            ← Back
          </Link>
        ) : null}
        <h1 className="ll-page-title">{title}</h1>
      </div>
      <Link className="ll-btn ll-btn-sm ll-btn-subtle" to="/profile">
        Profile
      </Link>
    </div>
  );
}

function DayList({ profile }: { profile: Profile }) {
  const nav = useNavigate();
  const { state, addDay, removeDay } = useStore();
  const now = new Date();
  const [picker, setPicker] = useState({
    month: now.getMonth() + 1,
    day: now.getDate(),
    year: now.getFullYear(),
  });
  const toIso = `${picker.year}-${String(picker.month).padStart(2, '0')}-${String(picker.day).padStart(2, '0')}`;
  return (
    <main className="ll-page ll-main">
      <AppHeader title="leanlog" />
      <SectionCard title="Add day">
        <p className="ll-section-note">Choose month, day, and year to create a new log day.</p>
        <DateSelect3
          month={picker.month}
          day={picker.day}
          year={picker.year}
          onChange={setPicker}
        />
        <Button onClick={() => addDay(toIso, dayTargetsFromProfile(profile))}>Add day</Button>
      </SectionCard>
      <ListSectionCard
        title="Days"
        items={state.days
          .slice()
          .sort((a, b) => (a.date < b.date ? 1 : -1))
          .map((d) => {
            const totals = dayTotals(d);
            return {
              id: d.id,
              title: prettyDate(d.date),
              meta: (
                <>
                  {totals.calories}
                  <span className="ll-unit"> kcal</span> · P {totals.protein}
                  <span className="ll-unit">g</span> · C {totals.carbs}
                  <span className="ll-unit">g</span> · F {totals.fat}
                  <span className="ll-unit">g</span>
                </>
              ),
              onOpen: () => nav(`/day/${d.id}`),
              onDelete: () => removeDay(d.id),
              deleteLabel: 'Delete day',
            };
          })}
      />
    </main>
  );
}

function DayDetail({ profile }: { profile: Profile }) {
  const { dayId } = useParams();
  const nav = useNavigate();
  const { state, addMeal, removeMeal, setState } = useStore();
  const day = state.days.find((d) => d.id === dayId);
  if (!day) return <Navigate to="/" replace />;
  const totals = dayTotals(day);
  const netCarbs = round1(Math.max(0, totals.carbs - totals.fiber));
  const calorieTarget = day.targets.calories;
  const pctDiff = calorieTarget > 0 ? Math.abs(totals.calories - calorieTarget) / calorieTarget : 1;
  const calorieColor =
    pctDiff <= 0.05 ? 'var(--ll-saved)' : pctDiff <= 0.15 ? 'var(--ll-warn)' : 'var(--ll-danger)';

  return (
    <main className="ll-page ll-main">
      <AppHeader title={prettyDate(day.date)} backTo="/" />
      <SectionCard>
        <div className="ll-stack-lg">
          <div className="ll-row ll-between items-start">
            <h3 className="ll-card-title mb-0">Daily totals</h3>
            <Button
              variant="ghost"
              onClick={() => {
                const nextTargets = dayTargetsFromProfile(profile);
                setState((s) => ({
                  ...s,
                  days: s.days.map((d) => (d.id === day.id ? { ...d, targets: nextTargets } : d)),
                }));
              }}
            >
              Update targets
            </Button>
          </div>
          <p className="ll-page-subtitle" style={{ color: calorieColor }}>
            {totals.calories} / {calorieTarget}
            <span className="ll-unit"> kcal</span>
          </p>
          <ProgressBar value={totals.calories} max={calorieTarget || 1} color={calorieColor} />
          <div className="ll-row flex-wrap">
            <p className="ll-meta">
              FAT {totals.fat} / {day.targets.macros.fat}g
            </p>
            <span className="ll-meta">·</span>
            <p className="ll-meta">
              PROTEIN {totals.protein} / {day.targets.macros.protein}g
            </p>
            <span className="ll-meta">·</span>
            <p className="ll-meta">
              CARBS {netCarbs} net / {totals.carbs} / {day.targets.macros.carbs}g
            </p>
          </div>
        </div>
      </SectionCard>
      <ListSectionCard
        title={`Meals ${day.meals.length} / ${state.settings.mealCountTarget}`}
        emptyText="No meals yet. Add one below."
        childrenTop
        items={day.meals.map((m) => {
          const totals = mealTotals(m);
          return {
            id: m.id,
            title: m.name || 'UNTITLED MEAL',
            meta: (
              <>
                {totals.calories}
                <span className="ll-unit"> kcal</span> · P {totals.protein}
                <span className="ll-unit">g</span> · C {totals.carbs}
                <span className="ll-unit">g</span> · F {totals.fat}
                <span className="ll-unit">g</span>
              </>
            ),
            onOpen: () => nav(`/day/${day.id}/meal/${m.id}`),
            onDelete: () => removeMeal(day.id, m.id),
            deleteLabel: 'Delete meal',
          };
        })}
      >
        <div className="ll-row">
          <NumberInput
            label="Meal count target"
            value={state.settings.mealCountTarget}
            onChange={(n) =>
              setState((s) => ({ ...s, settings: { ...s.settings, mealCountTarget: n } }))
            }
            onBlur={() =>
              setState((s) => ({
                ...s,
                settings: { ...s.settings, mealCountTarget: round1(s.settings.mealCountTarget) },
              }))
            }
          />
          <Button
            className="w-full"
            onClick={() => {
              const meal = addMeal(day.id, `MEAL ${day.meals.length + 1}`);
              if (meal) nav(`/day/${day.id}/meal/${meal.id}`);
            }}
          >
            Add meal
          </Button>
        </div>
      </ListSectionCard>
    </main>
  );
}

function MealEdit() {
  /* unchanged */
  const { dayId, mealId } = useParams();
  const nav = useNavigate();
  const { state, renameMeal, removeMeal, upsertIngredient, removeIngredient } = useStore();
  const day = state.days.find((d) => d.id === dayId);
  const meal = day?.meals.find((m) => m.id === mealId);
  const [draft, setDraft] = useState<IngredientDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showBlankNamePrompt, setShowBlankNamePrompt] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanResult, setScanResult] = useState<NutritionScanResult | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { saved, markDirty, markSaved } = useSavedSections();

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

  if (!day || !meal) return <Navigate to="/" replace />;

  const saveIngredient = () => {
    const next: Ingredient = {
      id: editingId ?? uuid(),
      ...draft,
      name: normalizeIngredientName(draft.name),
    };
    upsertIngredient(day.id, meal.id, next);
    markSaved('ingredientForm');
    setDraft(emptyDraft);
    setEditingId(null);
  };
  const totals = mealTotals(meal);

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

  const onScanFile = async (file: File) => {
    setScanError('');
    setScanLoading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('weightGrams', draft.weight > 0 ? String(draft.weight) : '');
      formData.append('name', draft.name);
      const response = await fetch('/api/scan-nutrition', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Scan failed. Try again with a clearer label photo.');
      const result = (await response.json()) as NutritionScanResult;
      setScanResult(result);
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Scan failed');
    } finally {
      setScanLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const applyScan = () => {
    if (!scanResult || !scanResult.canApply) return;
    markDirty('ingredientForm');
    setDraft((prev) => ({
      ...prev,
      name: prev.name.trim() ? prev.name : (scanResult.proposed.name ?? prev.name),
      weight: scanResult.proposed.weight,
      calories: scanResult.proposed.calories,
      fat: scanResult.proposed.fat,
      saturatedFat: scanResult.proposed.saturatedFat,
      carbs: scanResult.proposed.carbs,
      fiber: scanResult.proposed.fiber,
      protein: scanResult.proposed.protein,
    }));
    setScanResult(null);
  };
  return (
    <main className="ll-page ll-main">
      {/* same body omitted for brevity in this comment */}
      <div className="ll-row ll-between flex-wrap">
        <div className="ll-row flex-wrap">
          <Link className="ll-btn ll-btn-sm ll-btn-subtle" to={`/day/${day.id}`}>
            ← Back
          </Link>
          <h1 className="ll-page-title">{meal.name || 'Meal'}</h1>
          <p className="ll-meta">
            {totals.calories}
            <span className="ll-unit"> kcal</span> · P {totals.protein}
            <span className="ll-unit">g</span> · C {totals.carbs}
            <span className="ll-unit">g</span> · F {totals.fat}
            <span className="ll-unit">g</span>
          </p>
        </div>
        <Link className="ll-btn ll-btn-sm ll-btn-subtle" to="/profile">
          Profile
        </Link>
      </div>
      <SectionCard title="Meal name" saved={saved.mealName}>
        <p className="ll-section-note">Name is required before leaving this page.</p>
        <Input
          value={meal.name}
          onChange={(e) => {
            markDirty('mealName');
            renameMeal(day.id, meal.id, e.target.value);
            markSaved('mealName');
          }}
          normalizeOnBlur={normalizeIngredientName}
          onNormalized={(name) => {
            markDirty('mealName');
            renameMeal(day.id, meal.id, name);
            markSaved('mealName');
          }}
        />
        <div className="ll-row">
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              removeMeal(day.id, meal.id);
              nav(`/day/${day.id}`);
            }}
          >
            Delete meal and all ingredients
          </Button>
        </div>
        <div className="ll-stack mt-3">
          <h4 className="ll-card-title mb-0">Ingredients</h4>
          <p className="ll-section-note">Tap an ingredient row to edit values.</p>
          {meal.ingredients.length ? null : <p className="ll-section-note">No items</p>}
          {meal.ingredients.map((i) => (
            <SwipeRow
              key={i.id}
              onDelete={() => removeIngredient(day.id, meal.id, i.id)}
              deleteLabel="Delete ingredient"
            >
              <div
                className="ll-list-row ll-row-link"
                role="link"
                tabIndex={0}
                onClick={() => {
                  setEditingId(i.id);
                  setDraft(i);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setEditingId(i.id);
                    setDraft(i);
                  }
                }}
              >
                <div className="ll-stack">
                  <span className="text-sm font-medium">{i.name}</span>
                  <small className="ll-meta">
                    {i.calories}
                    <span className="ll-unit"> kcal</span> · F {i.fat}
                    <span className="ll-unit">g</span> · C {i.carbs}
                    <span className="ll-unit">g</span> · P {i.protein}
                    <span className="ll-unit">g</span>
                  </small>
                </div>
                <div className="ll-row">
                  <Button
                    size="sm"
                    variant="danger"
                    className="desktop-only"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeIngredient(day.id, meal.id, i.id);
                    }}
                  >
                    Delete ingredient
                  </Button>
                </div>
              </div>
            </SwipeRow>
          ))}
        </div>
      </SectionCard>
      <IngredientEntryCard
        value={draft}
        saved={saved.ingredientForm}
        submitLabel={editingId ? 'Update' : 'Add'}
        onChange={(next) => {
          markDirty('ingredientForm');
          setDraft(next);
        }}
        onSubmit={saveIngredient}
        normalizeNameOnBlur={normalizeIngredientName}
        weightAction={
          <Button size="sm" variant="ghost" onClick={openCamera} disabled={scanLoading}>
            {scanLoading ? 'Scanning…' : 'Scan Nutrition Facts'}
          </Button>
        }
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onScanFile(file);
        }}
      />
      {scanError ? <small className="ll-warn">{scanError}</small> : null}
      {cameraError ? <small className="ll-warn">{cameraError}</small> : null}
      <Modal
        open={cameraOpen}
        title="Take nutrition photo"
        onClose={() => {
          stopCamera();
          setCameraOpen(false);
        }}
      >
        <div className="ll-stack">
          <video
            ref={videoRef}
            className="w-full rounded-[10px] border"
            autoPlay
            playsInline
            muted
          />
          <div className="ll-row ll-between">
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
      <Modal open={!!scanResult} title="Review nutrition scan" onClose={() => setScanResult(null)}>
        {scanResult ? (
          <div className="ll-stack">
            <p className="ll-section-note">
              Compare current values with scanned values before applying.
            </p>
            <p className="ll-meta">
              Weight: {draft.weight} → {scanResult.proposed.weight}g
            </p>
            <p className="ll-meta">
              Calories: {draft.calories} → {scanResult.proposed.calories}
            </p>
            <p className="ll-meta">
              Fat: {draft.fat} → {scanResult.proposed.fat}g
            </p>
            <p className="ll-meta">
              Saturated fat: {draft.saturatedFat} → {scanResult.proposed.saturatedFat}g
            </p>
            <p className="ll-meta">
              Carbs: {draft.carbs} → {scanResult.proposed.carbs}g
            </p>
            <p className="ll-meta">
              Fiber: {draft.fiber} → {scanResult.proposed.fiber}g
            </p>
            <p className="ll-meta">
              Protein: {draft.protein} → {scanResult.proposed.protein}g
            </p>
            {draft.name.trim() ? null : (
              <p className="ll-meta">
                Ingredient title: {draft.name || '(blank)'} →{' '}
                {scanResult.proposed.name || '(unchanged)'}
              </p>
            )}
            {scanResult.notes.length ? (
              <small className="ll-section-note">{scanResult.notes.join(' ')}</small>
            ) : null}
            {scanResult.canApply ? null : (
              <small className="ll-warn">
                {scanResult.blockReason ?? 'Scan cannot be applied.'}
              </small>
            )}
            <div className="ll-row ll-between">
              <Button variant="ghost" onClick={openCamera} disabled={scanLoading}>
                Retake photo
              </Button>
              <div className="ll-row">
                <Button variant="secondary" onClick={() => setScanResult(null)}>
                  Cancel
                </Button>
                <Button onClick={applyScan} disabled={!scanResult.canApply}>
                  Apply
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
      <Modal
        open={showBlankNamePrompt}
        title="Meal name is required"
        onClose={() => setShowBlankNamePrompt(false)}
      >
        <p>Name this meal before leaving, or discard this whole meal draft.</p>
        <div className="ll-row">
          <Button onClick={() => setShowBlankNamePrompt(false)}>Stay and edit</Button>
          <Button
            variant="danger"
            onClick={() => {
              removeMeal(day.id, meal.id);
              nav(`/day/${day.id}`);
            }}
          >
            Discard meal draft and all ingredients
          </Button>
        </div>
      </Modal>
    </main>
  );
}

function ProfilePage({
  profile,
  setProfile,
}: {
  profile: Profile;
  setProfile: Dispatch<SetStateAction<Profile>>;
}) {
  const { state, setState } = useStore();
  const { saved, markDirty, markSaved } = useSavedSections();
  const [importError, setImportError] = useState('');

  const weightError =
    profile.bodyInfo.weightLbs === 0
      ? 'Weight is required.'
      : profile.bodyInfo.weightLbs > 0 && profile.bodyInfo.weightLbs < 90
        ? 'see a doctor'
        : '';
  const computedCalories =
    profile.calorieTarget.mode === 'custom'
      ? profile.calorieTarget.targetCalories
      : calorieFromMode(profile.bodyInfo.weightLbs, profile.calorieTarget.mode);
  const targetCaloriesText =
    profile.calorieTarget.mode === 'custom'
      ? String(profile.calorieTarget.targetCalories ?? '')
      : computedCalories == null
        ? ''
        : String(computedCalories);

  const macro = useMemo(() => {
    const target =
      profile.calorieTarget.mode === 'custom'
        ? profile.calorieTarget.targetCalories
        : computedCalories;
    if (!target) return { fatsHint: '', carbsHint: '', proteinHint: '', error: '' };
    if (profile.macroTargets.mode === 'percentage') {
      const total =
        profile.macroTargets.fats + profile.macroTargets.carbs + profile.macroTargets.protein;
      return {
        fatsHint: `${Math.round((target * (profile.macroTargets.fats / 100)) / 9)}g`,
        carbsHint: `${Math.round((target * (profile.macroTargets.carbs / 100)) / 4)}g`,
        proteinHint: `${Math.round((target * (profile.macroTargets.protein / 100)) / 4)}g`,
        error: total === 100 ? '' : 'Macro percentages must add up to 100.',
      };
    }
    const kcal =
      profile.macroTargets.fats * 9 +
      profile.macroTargets.carbs * 4 +
      profile.macroTargets.protein * 4;
    const pct = (n: number, calsPerGram: number) =>
      `${Math.round(((n * calsPerGram) / target) * 100)}% total`;
    return {
      fatsHint: pct(profile.macroTargets.fats, 9),
      carbsHint: pct(profile.macroTargets.carbs, 4),
      proteinHint: pct(profile.macroTargets.protein, 4),
      error:
        Math.abs(kcal - target) <= 5 ? '' : 'Macro calories must match target calories (±5 kcal).',
    };
  }, [profile, computedCalories]);

  const setAndSave = (next: Profile, key: keyof SaveSections) => {
    markDirty(key);
    setProfile(next);
    markSaved(key);
  };

  return (
    <main className="ll-page ll-main">
      <AppHeader title="Profile" backTo="/" />

      <BodyInfoCard
        saved={saved.bodyInfo}
        weightLbs={profile.bodyInfo.weightLbs}
        heightInches={profile.bodyInfo.heightInches}
        weightError={weightError}
        onWeightChange={(n) =>
          setProfile((p) => ({
            ...p,
            bodyInfo: { ...p.bodyInfo, weightLbs: Math.max(0, Math.floor(n)) },
          }))
        }
        onHeightChange={(n) =>
          setProfile((p) => ({
            ...p,
            bodyInfo: { ...p.bodyInfo, heightInches: Math.max(0, Math.floor(n)) },
          }))
        }
        onWeightBlur={() =>
          setAndSave(
            {
              ...profile,
              calorieTarget: {
                ...profile.calorieTarget,
                targetCalories:
                  profile.calorieTarget.mode === 'custom'
                    ? profile.calorieTarget.targetCalories
                    : calorieFromMode(profile.bodyInfo.weightLbs, profile.calorieTarget.mode),
              },
            },
            'bodyInfo',
          )
        }
        onHeightBlur={() => setAndSave(profile, 'bodyInfo')}
      />

      <CalorieTargetCard
        saved={saved.calorieTarget}
        mode={profile.calorieTarget.mode}
        targetCaloriesText={targetCaloriesText}
        canEditTargetCalories={profile.calorieTarget.mode === 'custom'}
        targetCaloriesError={
          profile.calorieTarget.mode === 'custom' &&
          profile.calorieTarget.targetCalories != null &&
          (profile.calorieTarget.targetCalories < 800 ||
            profile.calorieTarget.targetCalories > 9999)
            ? 'Target calories must be 800–9999.'
            : ''
        }
        onModeChange={(mode) => {
          const next = {
            ...profile,
            calorieTarget: {
              ...profile.calorieTarget,
              mode,
              targetCalories:
                mode === 'custom'
                  ? profile.calorieTarget.targetCalories
                  : calorieFromMode(profile.bodyInfo.weightLbs, mode),
            },
          };
          setAndSave(next, 'calorieTarget');
        }}
        onTargetCaloriesChange={(n) =>
          setProfile((p) => ({
            ...p,
            calorieTarget: {
              ...p.calorieTarget,
              targetCalories: Number.isFinite(n) ? Math.floor(n) : null,
            },
          }))
        }
        onTargetCaloriesBlur={() => setAndSave(profile, 'calorieTarget')}
      />

      <MacroTargetsCard
        saved={saved.macroTargets}
        mode={profile.macroTargets.mode}
        fats={profile.macroTargets.fats}
        carbs={profile.macroTargets.carbs}
        protein={profile.macroTargets.protein}
        fatsHint={macro.fatsHint}
        carbsHint={macro.carbsHint}
        proteinHint={macro.proteinHint}
        error={macro.error}
        onModeChange={(mode) =>
          setAndSave(
            { ...profile, macroTargets: { ...profile.macroTargets, mode } },
            'macroTargets',
          )
        }
        onFatsChange={(n) =>
          setProfile((p) => ({
            ...p,
            macroTargets: { ...p.macroTargets, fats: Math.max(0, Math.floor(n)) },
          }))
        }
        onCarbsChange={(n) =>
          setProfile((p) => ({
            ...p,
            macroTargets: { ...p.macroTargets, carbs: Math.max(0, Math.floor(n)) },
          }))
        }
        onProteinChange={(n) =>
          setProfile((p) => ({
            ...p,
            macroTargets: { ...p.macroTargets, protein: Math.max(0, Math.floor(n)) },
          }))
        }
        onBlur={() => setAndSave(profile, 'macroTargets')}
      />

      <SectionCard title="Theme" saved={saved.theme}>
        <div className="ll-row flex-wrap">
          {(['system', 'light', 'dark'] as const).map((theme) => (
            <Button
              key={theme}
              variant={state.settings.theme === theme ? 'primary' : 'ghost'}
              onClick={() => {
                markDirty('theme');
                setState((s) => ({ ...s, settings: { ...s.settings, theme } }));
                markSaved('theme');
              }}
            >
              {theme}
            </Button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Data" saved={saved.data}>
        <p className="ll-section-note">Import replaces all existing data.</p>
        <Button
          onClick={() => {
            const blob = new Blob([JSON.stringify({ state, profile }, null, 2)], {
              type: 'application/json',
            });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'leanlog-export.json';
            a.click();
            markSaved('data');
          }}
        >
          Export
        </Button>
        <Input
          type="file"
          accept="application/json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const parsed = JSON.parse(await file.text()) as { state: unknown; profile: unknown };
              const nextState = migrateState(parsed.state);
              const nextProfile = parseProfile(JSON.stringify(parsed.profile));
              if (
                !window.confirm(
                  'Replace all existing data with imported file? This cannot be undone.',
                )
              )
                return;
              setState(nextState);
              setProfile(nextProfile);
              setImportError('');
              markSaved('data');
            } catch (error) {
              setImportError(error instanceof Error ? error.message : 'Import failed');
            }
          }}
        />
        {importError ? <small className="ll-warn">{importError}</small> : null}
      </SectionCard>
    </main>
  );
}

export default function App() {
  const [profile, setProfile] = useState<Profile>(() =>
    parseProfile(localStorage.getItem(PROFILE_KEY)),
  );

  useEffect(() => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [profile]);

  return (
    <Routes>
      <Route path="/" element={<DayList profile={profile} />} />
      <Route path="/day/:dayId" element={<DayDetail profile={profile} />} />
      <Route path="/day/:dayId/meal/:mealId" element={<MealEdit />} />
      <Route path="/profile" element={<ProfilePage profile={profile} setProfile={setProfile} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
