import { useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import {
  useAuth,
  PricingTable,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/clerk-react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { uuidv7 } from '@leanlog/data-access';
import {
  BodyInfoCard,
  Button,
  CalorieTargetCard,
  DailyTotalsCard,
  DayDetailTemplate,
  DayListTemplate,
  FileInput,
  HelperText,
  Input,
  LandingTemplate,
  ListRow,
  MacroSummaryLine,
  MacroTargetsCard,
  MealEditTemplate,
  Modal,
  NumberInput,
  ProfileTemplate,
  SectionCard,
  SectionHeading,
  WarningText,
} from '@leanlog/ui';
import { caloriesFromMode, dayTargetsFromProfile } from '@leanlog/data-access';
import { normalizeIngredientName, prettyDate, round1 } from '../lib';
import { dayTotals, mealTotals } from '../selectors';
import { useStore } from '../state';
import { api } from '../api';
import type { UpsertIngredient, SaveSections } from '../types';

type IngredientDraft = Omit<UpsertIngredient, 'id' | 'mealId' | 'createdAt' | 'updatedAt'>;

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

const THEME_KEY = 'leanlog.theme';

function useTheme() {
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>(
    () => (localStorage.getItem(THEME_KEY) as 'system' | 'light' | 'dark') ?? 'system',
  );
  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return [theme, setTheme] as const;
}

const renderRouterNavLink = ({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className: string;
}) => (
  <Link className={className} to={href}>
    {label}
  </Link>
);

function HeaderAuthControl() {
  return (
    <SignedIn>
      <UserButton afterSignOutUrl="/" />
    </SignedIn>
  );
}

function RequireSignedIn({ children }: PropsWithChildren) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <Navigate to="/" replace />
      </SignedOut>
    </>
  );
}

function LandingPage() {
  return (
    <>
      <SignedIn>
        <Navigate to="/track" replace />
      </SignedIn>
      <SignedOut>
        <LandingTemplate
          appName="LeanLog"
          iconSrc="/icon-192.png"
          cta={
            <SignInButton mode="modal">
              <Button>Sign in / Sign up</Button>
            </SignInButton>
          }
          pricing={<PricingTable />}
        />
      </SignedOut>
    </>
  );
}

function DayList() {
  const nav = useNavigate();
  const { days, profile, loading, error, addDay, removeDay } = useStore();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <DayListTemplate
      heading={{
        title: 'leanlog',
        profileHref: '/track/profile',
        renderNavLink: renderRouterNavLink,
        rightContent: <HeaderAuthControl />,
      }}
      addDay={{
        onDayAdded: ({ month, day, year, totalMeals }) => {
          const toIso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          if (!profile) return;
          const targets = dayTargetsFromProfile(profile);
          void addDay(toIso, { ...targets, mealCountTarget: totalMeals });
        },
      }}
      days={days
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .map((d) => {
          const totals = dayTotals(d);
          return {
            id: d.id,
            title: prettyDate(d.date),
            meta: (
              <MacroSummaryLine
                calories={totals.calories}
                protein={totals.protein}
                carbs={totals.carbs}
                fat={totals.fat}
              />
            ),
            onOpen: () => nav(`/track/day/${d.id}`),
            onDelete: () => void removeDay(d.id),
            deleteLabel: 'Delete day',
          };
        })}
    />
  );
}

function DayDetail() {
  const { dayId } = useParams();
  const nav = useNavigate();
  const { days, profile, addMeal, removeMeal, updateDayTargets } = useStore();
  const [isEditingMealTarget, setIsEditingMealTarget] = useState(false);
  const [draftMealCountTarget, setDraftMealCountTarget] = useState(0);
  const [confirmMealTargetUpdate, setConfirmMealTargetUpdate] = useState(false);
  const day = days.find((d) => d.id === dayId);
  if (!day) return <Navigate to="/track" replace />;
  const totals = dayTotals(day);

  return (
    <DayDetailTemplate
      heading={{
        title: prettyDate(day.date),
        backHref: '/track',
        profileHref: '/track/profile',
        renderNavLink: renderRouterNavLink,
        rightContent: <HeaderAuthControl />,
      }}
      totalsSection={
        <DailyTotalsCard
          calories={totals.calories}
          calorieTarget={day.targetCalories}
          fat={totals.fat}
          protein={totals.protein}
          carbs={totals.carbs}
          fiber={totals.fiber}
          macroTargets={{ fat: day.targetFat, carbs: day.targetCarbs, protein: day.targetProtein }}
          onUpdateTargets={() => {
            if (!profile) return;
            const nextTargets = dayTargetsFromProfile(profile);
            void updateDayTargets(day.id, nextTargets);
          }}
        />
      }
      mealsTitle={`Meals ${day.meals.length} / ${day.mealCountTarget}`}
      mealsEmptyText="No meals yet. Add one below."
      mealsItems={day.meals.map((m) => {
        const mTotals = mealTotals(m);
        return {
          id: m.id,
          title: m.name || 'UNTITLED MEAL',
          meta: (
            <MacroSummaryLine
              calories={mTotals.calories}
              protein={mTotals.protein}
              carbs={mTotals.carbs}
              fat={mTotals.fat}
            />
          ),
          onOpen: () => nav(`/track/day/${day.id}/meal/${m.id}`),
          onDelete: () => void removeMeal(day.id, m.id),
          deleteLabel: 'Delete meal',
        };
      })}
      mealsControls={
        <div className="flex flex-col gap-2.5 mb-5">
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => {
              if (isEditingMealTarget) {
                setDraftMealCountTarget(day.mealCountTarget);
                setConfirmMealTargetUpdate(false);
              }
              setIsEditingMealTarget((v) => !v);
            }}
          >
            ✎ Edit meal target
          </Button>
          {isEditingMealTarget ? (
            <div className="flex items-center gap-2">
              <NumberInput
                label="Meal count target"
                value={draftMealCountTarget}
                onChange={(n) => setDraftMealCountTarget(Math.max(0, n))}
                onBlur={() => setDraftMealCountTarget((n) => round1(Math.max(0, n)))}
              />
              <Button
                variant={confirmMealTargetUpdate ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => {
                  const next = !confirmMealTargetUpdate;
                  setConfirmMealTargetUpdate(next);
                  if (next) {
                    void updateDayTargets(day.id, {
                      targetCalories: day.targetCalories,
                      targetFat: day.targetFat,
                      targetCarbs: day.targetCarbs,
                      targetProtein: day.targetProtein,
                      mealCountTarget: draftMealCountTarget,
                    });
                    setIsEditingMealTarget(false);
                    setConfirmMealTargetUpdate(false);
                  }
                }}
              >
                {confirmMealTargetUpdate ? 'Confirmed' : '☐ Confirm'}
              </Button>
            </div>
          ) : null}
          <Button
            className="w-full"
            onClick={async () => {
              const meal = await addMeal(day.id, `MEAL ${day.meals.length + 1}`);
              if (meal) nav(`/track/day/${day.id}/meal/${meal.id}`);
            }}
          >
            Add meal
          </Button>
        </div>
      }
    />
  );
}

function MealEdit() {
  const { dayId, mealId } = useParams();
  const nav = useNavigate();
  const { getToken } = useAuth();
  const { days, renameMeal, removeMeal, upsertIngredient, removeIngredient } = useStore();
  const day = days.find((d) => d.id === dayId);
  const meal = day?.meals.find((m) => m.id === mealId);
  const [mealName, setMealName] = useState(meal?.name ?? '');
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

  if (!day || !meal) return <Navigate to="/track" replace />;

  const saveIngredient = () => {
    const id = editingId ?? uuidv7();
    const next: UpsertIngredient = {
      id,
      mealId: meal.id,
      ...draft,
      name: normalizeIngredientName(draft.name),
    };
    void upsertIngredient(day.id, meal.id, next);
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
      const token = await getToken();
      const response = await fetch('/api/scan-nutrition', {
        method: 'POST',
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
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
    <MealEditTemplate
      heading={{
        title: meal.name || 'Meal',
        subtitle: (
          <MacroSummaryLine
            calories={totals.calories}
            protein={totals.protein}
            carbs={totals.carbs}
            fat={totals.fat}
          />
        ),
        backHref: `/track/day/${day.id}`,
        profileHref: '/track/profile',
        renderNavLink: renderRouterNavLink,
        rightContent: <HeaderAuthControl />,
      }}
      mealSection={
        <SectionCard title="Meal name" saved={saved.mealName}>
          <HelperText as="p">Name is required before leaving this page.</HelperText>
          <Input
            value={mealName}
            onChange={(e) => {
              setMealName(e.target.value);
              markDirty('mealName');
            }}
            normalizeOnBlur={normalizeIngredientName}
            onNormalized={(name) => {
              setMealName(name);
              void renameMeal(day.id, meal.id, name);
              markSaved('mealName');
            }}
            onBlur={() => {
              void renameMeal(day.id, meal.id, normalizeIngredientName(mealName));
              markSaved('mealName');
            }}
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                void removeMeal(day.id, meal.id);
                nav(`/track/day/${day.id}`);
              }}
            >
              Delete meal and all ingredients
            </Button>
          </div>
          <div className="flex flex-col gap-2.5 mt-3">
            <SectionHeading as="h4" noMargin>
              Ingredients
            </SectionHeading>
            <HelperText as="p">Tap an ingredient row to edit values.</HelperText>
            {meal.ingredients.length ? null : <HelperText as="p">No items</HelperText>}
            {meal.ingredients.map((i) => (
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
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      void removeIngredient(day.id, meal.id, i.id);
                    }}
                  >
                    Delete ingredient
                  </Button>
                }
                onOpen={() => {
                  setEditingId(i.id);
                  setDraft({
                    name: i.name,
                    weight: i.weight,
                    calories: i.calories,
                    fat: i.fat,
                    saturatedFat: i.saturatedFat,
                    carbs: i.carbs,
                    fiber: i.fiber,
                    protein: i.protein,
                  });
                }}
              />
            ))}
          </div>
        </SectionCard>
      }
      ingredientEntry={{
        value: draft,
        saved: saved.ingredientForm,
        submitLabel: editingId ? 'Update' : 'Add',
        onChange: (next) => {
          markDirty('ingredientForm');
          setDraft(next);
        },
        onSubmit: saveIngredient,
        normalizeNameOnBlur: normalizeIngredientName,
        weightAction: (
          <Button size="sm" variant="ghost" onClick={openCamera} disabled={scanLoading}>
            {scanLoading ? 'Scanning…' : 'Scan Label'}
          </Button>
        ),
      }}
    >
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
      {scanError ? <WarningText>{scanError}</WarningText> : null}
      {cameraError ? <WarningText>{cameraError}</WarningText> : null}
      <Modal
        open={cameraOpen}
        title="Take nutrition photo"
        onClose={() => {
          stopCamera();
          setCameraOpen(false);
        }}
      >
        <div className="flex flex-col gap-2.5">
          <video
            ref={videoRef}
            className="w-full rounded-[10px] border"
            autoPlay
            playsInline
            muted
          />
          <div className="flex items-center gap-2 justify-between">
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
          <div className="flex flex-col gap-2.5">
            <HelperText as="p">
              Compare current values with scanned values before applying.
            </HelperText>
            <HelperText as="p">
              Weight: {draft.weight} → {scanResult.proposed.weight}g
            </HelperText>
            <HelperText as="p">
              Calories: {draft.calories} → {scanResult.proposed.calories}
            </HelperText>
            <HelperText as="p">
              Fat: {draft.fat} → {scanResult.proposed.fat}g
            </HelperText>
            <HelperText as="p">
              Saturated fat: {draft.saturatedFat} → {scanResult.proposed.saturatedFat}g
            </HelperText>
            <HelperText as="p">
              Carbs: {draft.carbs} → {scanResult.proposed.carbs}g
            </HelperText>
            <HelperText as="p">
              Fiber: {draft.fiber} → {scanResult.proposed.fiber}g
            </HelperText>
            <HelperText as="p">
              Protein: {draft.protein} → {scanResult.proposed.protein}g
            </HelperText>
            {draft.name.trim() ? null : (
              <HelperText as="p">
                Ingredient title: {draft.name || '(blank)'} →{' '}
                {scanResult.proposed.name || '(unchanged)'}
              </HelperText>
            )}
            {scanResult.notes.length ? <HelperText>{scanResult.notes.join(' ')}</HelperText> : null}
            {scanResult.canApply ? null : (
              <WarningText>{scanResult.blockReason ?? 'Scan cannot be applied.'}</WarningText>
            )}
            <div className="flex items-center gap-2 justify-between">
              <Button variant="ghost" onClick={openCamera} disabled={scanLoading}>
                Retake photo
              </Button>
              <div className="flex items-center gap-2">
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
        <HelperText as="p">
          Name this meal before leaving, or discard this whole meal draft.
        </HelperText>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowBlankNamePrompt(false)}>Stay and edit</Button>
          <Button
            variant="danger"
            onClick={() => {
              void removeMeal(day.id, meal.id);
              nav(`/track/day/${day.id}`);
            }}
          >
            Discard meal draft and all ingredients
          </Button>
        </div>
      </Modal>
    </MealEditTemplate>
  );
}

function ProfilePage() {
  const { profile, updateProfile, patchProfileLocal } = useStore();
  const [theme, setTheme] = useTheme();
  const { getToken } = useAuth();
  const { saved, markDirty, markSaved } = useSavedSections();

  const computedCalories = useMemo(
    () =>
      profile?.calorieMode === 'custom'
        ? profile.targetCalories
        : profile
          ? caloriesFromMode(profile.weightLbs, profile.calorieMode)
          : null,
    [profile],
  );

  const macro = useMemo(() => {
    if (!profile) return { fatsHint: '', carbsHint: '', proteinHint: '', error: '' };
    const target = profile.calorieMode === 'custom' ? profile.targetCalories : computedCalories;
    if (!target) return { fatsHint: '', carbsHint: '', proteinHint: '', error: '' };
    if (profile.macroMode === 'percentage') {
      const total = profile.macroFats + profile.macroCarbs + profile.macroProtein;
      return {
        fatsHint: `${Math.round((target * (profile.macroFats / 100)) / 9)}g`,
        carbsHint: `${Math.round((target * (profile.macroCarbs / 100)) / 4)}g`,
        proteinHint: `${Math.round((target * (profile.macroProtein / 100)) / 4)}g`,
        error: total === 100 ? '' : 'Macro percentages must add up to 100.',
      };
    }
    const kcal = profile.macroFats * 9 + profile.macroCarbs * 4 + profile.macroProtein * 4;
    const pct = (n: number, calsPerGram: number) =>
      `${Math.round(((n * calsPerGram) / target) * 100)}% total`;
    return {
      fatsHint: pct(profile.macroFats, 9),
      carbsHint: pct(profile.macroCarbs, 4),
      proteinHint: pct(profile.macroProtein, 4),
      error:
        Math.abs(kcal - target) <= 5 ? '' : 'Macro calories must match target calories (±5 kcal).',
    };
  }, [profile, computedCalories]);

  if (!profile) return null;

  const weightError =
    profile.weightLbs === 0
      ? 'Weight is required.'
      : profile.weightLbs > 0 && profile.weightLbs < 90
        ? 'see a doctor'
        : '';

  const targetCaloriesText =
    profile.calorieMode === 'custom'
      ? String(profile.targetCalories ?? '')
      : computedCalories == null
        ? ''
        : String(computedCalories);

  const save = (data: Parameters<typeof updateProfile>[0], key: keyof SaveSections) => {
    markDirty(key);
    void updateProfile(data);
    markSaved(key);
  };

  const handleExport = async () => {
    const token = await getToken();
    if (!token) return;
    const [{ days }, p] = await Promise.all([api.days.list(token), api.profile.get(token)]);
    const blob = new Blob([JSON.stringify({ days, profile: p }, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'leanlog-export.json';
    a.click();
    markSaved('data');
  };

  return (
    <ProfileTemplate
      heading={{
        title: 'Profile',
        backHref: '/track',
        profileHref: '/track/profile',
        renderNavLink: renderRouterNavLink,
        rightContent: <HeaderAuthControl />,
      }}
    >
      <BodyInfoCard
        saved={saved.bodyInfo}
        weightLbs={profile.weightLbs}
        heightInches={profile.heightInches}
        weightError={weightError}
        onWeightChange={(n) => patchProfileLocal({ weightLbs: Math.max(0, Math.floor(n)) })}
        onHeightChange={(n) => patchProfileLocal({ heightInches: Math.max(0, Math.floor(n)) })}
        onWeightBlur={() => save({ weightLbs: profile.weightLbs }, 'bodyInfo')}
        onHeightBlur={() => save({ heightInches: profile.heightInches }, 'bodyInfo')}
      />

      <CalorieTargetCard
        saved={saved.calorieTarget}
        mode={profile.calorieMode}
        targetCaloriesText={targetCaloriesText}
        canEditTargetCalories={profile.calorieMode === 'custom'}
        targetCaloriesError={
          profile.calorieMode === 'custom' &&
          profile.targetCalories != null &&
          (profile.targetCalories < 800 || profile.targetCalories > 9999)
            ? 'Target calories must be 800–9999.'
            : ''
        }
        onModeChange={(mode) =>
          save(
            {
              calorieMode: mode,
              targetCalories:
                mode === 'custom'
                  ? profile.targetCalories
                  : caloriesFromMode(profile.weightLbs, mode),
            },
            'calorieTarget',
          )
        }
        onTargetCaloriesChange={(n) =>
          patchProfileLocal({ targetCalories: Number.isFinite(n) ? Math.floor(n) : null })
        }
        onTargetCaloriesBlur={() =>
          save({ targetCalories: profile.targetCalories }, 'calorieTarget')
        }
      />

      <MacroTargetsCard
        saved={saved.macroTargets}
        mode={profile.macroMode}
        fats={profile.macroFats}
        carbs={profile.macroCarbs}
        protein={profile.macroProtein}
        fatsHint={macro.fatsHint}
        carbsHint={macro.carbsHint}
        proteinHint={macro.proteinHint}
        error={macro.error}
        onModeChange={(mode) => save({ macroMode: mode }, 'macroTargets')}
        onFatsChange={(n) => patchProfileLocal({ macroFats: Math.max(0, Math.floor(n)) })}
        onCarbsChange={(n) => patchProfileLocal({ macroCarbs: Math.max(0, Math.floor(n)) })}
        onProteinChange={(n) => patchProfileLocal({ macroProtein: Math.max(0, Math.floor(n)) })}
        onBlur={() =>
          save(
            {
              macroFats: profile.macroFats,
              macroCarbs: profile.macroCarbs,
              macroProtein: profile.macroProtein,
            },
            'macroTargets',
          )
        }
      />

      <SectionCard title="Theme" saved={saved.theme}>
        <div className="flex items-center gap-2 flex-wrap">
          {(['system', 'light', 'dark'] as const).map((t) => (
            <Button
              key={t}
              variant={theme === t ? 'primary' : 'ghost'}
              onClick={() => {
                markDirty('theme');
                setTheme(t);
                markSaved('theme');
              }}
            >
              {t}
            </Button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Data" saved={saved.data}>
        <Button onClick={() => void handleExport()}>Export</Button>
      </SectionCard>
    </ProfileTemplate>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/track"
        element={
          <RequireSignedIn>
            <DayList />
          </RequireSignedIn>
        }
      />
      <Route
        path="/track/day/:dayId"
        element={
          <RequireSignedIn>
            <DayDetail />
          </RequireSignedIn>
        }
      />
      <Route
        path="/track/day/:dayId/meal/:mealId"
        element={
          <RequireSignedIn>
            <MealEdit />
          </RequireSignedIn>
        }
      />
      <Route
        path="/track/profile"
        element={
          <RequireSignedIn>
            <ProfilePage />
          </RequireSignedIn>
        }
      />
      <Route
        path="*"
        element={
          <>
            <SignedIn>
              <Navigate to="/track" replace />
            </SignedIn>
            <SignedOut>
              <Navigate to="/" replace />
            </SignedOut>
          </>
        }
      />
    </Routes>
  );
}
