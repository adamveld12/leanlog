import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
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
  AnalyticsScope,
  BodyInfoCard,
  Button,
  CalorieTargetCard,
  cn,
  DailyTotalsCard,
  DayDetailTemplate,
  ErrorTemplate,
  DayListTemplate,
  DayWeightCard,
  FileInput,
  HelperText,
  IngredientEntryCard,
  Input,
  LabelScanCard,
  LandingTemplate,
  ListRow,
  LoadingState,
  MacroSummaryLine,
  MacroTargetsCard,
  MealEditTemplate,
  Modal,
  MonthCalendarCard,
  NumberInput,
  ProfileTemplate,
  QuickActionsCard,
  recipes,
  ScanReviewModal,
  SectionCard,
  SectionHeading,
  Tabs,
  Text,
  WeeklyStatsCard,
  WeightTrendCard,
  useAnalytics,
} from '@leanlog/ui';
import type { LabelScanValue } from '@leanlog/ui';
import { caloriesFromMode, dayTargetsFromProfile } from '@leanlog/data-access';
import type { ScanResolution } from '@leanlog/data-access';
import { normalizeIngredientName, prettyDate, round1, todayIso } from '../lib';
import {
  dayTotals,
  mealTotals,
  daysThisWeek,
  daysLast90,
  todayLog,
  trackedDatesMap,
  aggregateStats,
  selectWeightEntries,
} from '../selectors';
import { useStore } from '../state';
import { api } from '../api';
import type { UpsertIngredient, SaveSections } from '../types';

type IngredientDraft = Omit<UpsertIngredient, 'id' | 'mealId' | 'createdAt' | 'updatedAt'>;

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

type RouteLoadStatus = 'loading' | 'not_found' | 'error';
type RouteLoadState = { dayId: string; status: RouteLoadStatus; error: string };

function PageLoadingState({ label }: { label: string }) {
  return (
    <div className={cn(recipes.stack.centerFull, 'min-h-screen')}>
      <LoadingState label={label} />
    </div>
  );
}

function RouteLoadingState({ title }: { title: string }) {
  return <PageLoadingState label={title} />;
}

function RouteErrorState({ message }: { message: string }) {
  const nav = useNavigate();

  return (
    <ErrorTemplate
      title="Unable to load tracker data"
      message={message}
      homeHref="/"
      retryLabel="Back to days"
      onRetry={() => nav('/track')}
    />
  );
}

function TrackerErrorState({ message }: { message: string }) {
  return <ErrorTemplate title="Unable to load LeanLog" message={message} homeHref="/" />;
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
  const { days, profile, loading, error, addDay, addMeal } = useStore();

  const maintenance = useMemo(
    () => (profile ? (caloriesFromMode(profile.weightLbs, 'maintenance') ?? 0) : 0),
    [profile],
  );

  const today = useMemo(() => todayLog(days), [days]);
  const todayTotalsData = useMemo(() => (today ? dayTotals(today) : null), [today]);

  const weekDays = useMemo(() => daysThisWeek(days), [days]);
  const weeklyStats = useMemo(() => aggregateStats(weekDays, maintenance), [weekDays, maintenance]);

  const last90Days = useMemo(() => daysLast90(days), [days]);
  const overallStats = useMemo(
    () => aggregateStats(last90Days, maintenance),
    [last90Days, maintenance],
  );

  const dateMap = useMemo(() => trackedDatesMap(days), [days]);
  const weightEntries = useMemo(() => selectWeightEntries(days), [days]);
  const selectDay = useCallback((dayId: string) => nav(`/track/day/${dayId}`), [nav]);

  const hasDays = days.length > 0;
  const pendingNavRef = useRef(false);

  useEffect(() => {
    if (pendingNavRef.current && today) {
      pendingNavRef.current = false;
      nav(`/track/day/${today.id}`);
    }
  }, [today, nav]);

  async function handleAction() {
    if (!profile || pendingNavRef.current) return;
    if (today) {
      const meal = await addMeal(today.id, `Meal ${today.meals.length + 1}`);
      if (meal) nav(`/track/day/${today.id}/meal/${meal.id}`);
      return;
    }
    const targets = dayTargetsFromProfile(profile);
    pendingNavRef.current = true;
    addDay(todayIso(), { ...targets, mealCountTarget: 3 }).catch(() => {
      pendingNavRef.current = false;
    });
  }

  if (loading) return <PageLoadingState label="Loading your days…" />;
  if (error) return <TrackerErrorState message={error} />;

  return (
    <DayListTemplate
      heading={{
        title: 'leanlog',
        profileHref: '/track/profile',
        renderNavLink: renderRouterNavLink,
        rightContent: <HeaderAuthControl />,
      }}
      quickActions={
        <QuickActionsCard
          hasToday={!!today}
          hasDays={hasDays}
          today={
            todayTotalsData && today
              ? {
                  calories: todayTotalsData.calories,
                  calorieTarget: today.targetCalories,
                  protein: todayTotalsData.protein,
                  proteinTarget: today.targetProtein,
                  carbs: todayTotalsData.carbs,
                  carbsTarget: today.targetCarbs,
                  fat: todayTotalsData.fat,
                  fatTarget: today.targetFat,
                }
              : undefined
          }
          week={
            weekDays.length > 0
              ? {
                  calories: weeklyStats.totalCalories,
                  calorieTarget: weeklyStats.targetCalories,
                  protein: weeklyStats.totalProtein,
                  proteinTarget: weeklyStats.targetProtein,
                  carbs: weeklyStats.totalCarbs,
                  carbsTarget: weeklyStats.targetCarbs,
                  fat: weeklyStats.totalFat,
                  fatTarget: weeklyStats.targetFat,
                }
              : undefined
          }
          weekDayCount={weekDays.length}
          onAction={() => void handleAction()}
        />
      }
      statistics={
        <WeeklyStatsCard
          weekly={{
            accuracyOverall: weeklyStats.accuracy.overall,
            accuracyCalories: weeklyStats.accuracy.calories,
            accuracyProtein: weeklyStats.accuracy.protein,
            accuracyCarbs: weeklyStats.accuracy.carbs,
            accuracyFat: weeklyStats.accuracy.fat,
            coverage: weeklyStats.coverage,
            mealsTracked: weeklyStats.mealsTracked,
            mealsExpected: weeklyStats.mealsExpected,
            estimatedWeightLost: weeklyStats.estimatedWeightLost,
            certainty: weeklyStats.certainty,
          }}
          overall={{
            accuracyOverall: overallStats.accuracy.overall,
            accuracyCalories: overallStats.accuracy.calories,
            accuracyProtein: overallStats.accuracy.protein,
            accuracyCarbs: overallStats.accuracy.carbs,
            accuracyFat: overallStats.accuracy.fat,
            coverage: overallStats.coverage,
            mealsTracked: overallStats.mealsTracked,
            mealsExpected: overallStats.mealsExpected,
            estimatedWeightLost: overallStats.estimatedWeightLost,
            certainty: overallStats.certainty,
          }}
          hasWeeklyData={weekDays.length > 0}
          hasOverallData={last90Days.length > 0}
        />
      }
      weightTrend={
        <WeightTrendCard entries={weightEntries} goalWeightLbs={profile?.goalWeightLbs ?? null} />
      }
      calendar={
        <MonthCalendarCard
          trackedDates={dateMap}
          onSelectDay={selectDay}
          emptyHint={!hasDays ? 'Start logging to fill in your calendar!' : undefined}
        />
      }
      addDay={{
        onDayAdded: ({ month, day, year, totalMeals }) => {
          const toIso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          if (!profile) return;
          const targets = dayTargetsFromProfile(profile);
          void addDay(toIso, { ...targets, mealCountTarget: totalMeals });
        },
      }}
    />
  );
}

function DayDetail() {
  const { dayId } = useParams();
  const nav = useNavigate();
  const { days, profile, ensureDayLoaded, addMeal, removeMeal, updateDayTargets, updateDayWeight } =
    useStore();
  const { saved, markDirty, markSaved } = useSavedSections();
  const [isEditingMealTarget, setIsEditingMealTarget] = useState(false);
  const [draftMealCountTarget, setDraftMealCountTarget] = useState(0);
  const [confirmMealTargetUpdate, setConfirmMealTargetUpdate] = useState(false);
  const [savingWeight, setSavingWeight] = useState(false);
  const [routeLoad, setRouteLoad] = useState<RouteLoadState>({
    dayId: dayId ?? '',
    status: 'loading',
    error: '',
  });
  const day = days.find((d) => d.id === dayId);
  const routeStatus = routeLoad.dayId === dayId ? routeLoad.status : 'loading';

  useEffect(() => {
    if (!dayId || day) return;

    let cancelled = false;
    void ensureDayLoaded(dayId).then((result) => {
      if (cancelled) return;
      if (result.status === 'found') return;
      setRouteLoad({
        dayId,
        status: result.status,
        error: result.status === 'error' ? result.error : '',
      });
    });

    return () => {
      cancelled = true;
    };
  }, [dayId, day, ensureDayLoaded]);

  if (!dayId || routeStatus === 'not_found') return <Navigate to="/track" replace />;
  if (routeStatus === 'error') return <RouteErrorState message={routeLoad.error} />;
  if (!day) return <RouteLoadingState title="Loading day…" />;
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
      weightSection={
        <DayWeightCard
          key={day.id}
          saved={saved.dayWeight}
          saving={savingWeight}
          weightLbs={day.weightLbs}
          onSave={(next) => {
            markDirty('dayWeight');
            setSavingWeight(true);
            void updateDayWeight(day.id, next)
              .then(() => markSaved('dayWeight'))
              .finally(() => setSavingWeight(false));
          }}
        />
      }
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
        <div className={cn(recipes.stack.sm, 'mb-5')}>
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
            <div className={recipes.stack.row}>
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
  const { days, ensureDayLoaded, renameMeal, removeMeal, upsertIngredient, removeIngredient } =
    useStore();
  const day = days.find((d) => d.id === dayId);
  const meal = day?.meals.find((m) => m.id === mealId);
  const [mealNameDraft, setMealNameDraft] = useState<{ mealId: string | null; name: string }>({
    mealId: meal?.id ?? null,
    name: meal?.name ?? '',
  });
  const mealName = mealNameDraft.mealId === meal?.id ? mealNameDraft.name : (meal?.name ?? '');
  const setMealName = (name: string) => setMealNameDraft({ mealId: meal?.id ?? null, name });
  const [draft, setDraft] = useState<IngredientDraft>(emptyDraft);
  const [draftSource, setDraftSource] = useState<'manual' | 'scanned'>('manual');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [entryTab, setEntryTab] = useState<'manual' | 'scan' | 'database'>('manual');
  const [scanForm, setScanForm] = useState<LabelScanValue>({
    name: '',
    mode: 'weight',
    amount: 0,
  });
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanResult, setScanResult] = useState<ScanResolution | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const track = useAnalytics();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { saved, markDirty, markSaved } = useSavedSections();

  const [routeLoad, setRouteLoad] = useState<RouteLoadState>({
    dayId: dayId ?? '',
    status: 'loading',
    error: '',
  });
  const routeStatus = routeLoad.dayId === dayId ? routeLoad.status : 'loading';

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!dayId || day) return;

    let cancelled = false;
    void ensureDayLoaded(dayId).then((result) => {
      if (cancelled) return;
      if (result.status === 'found') return;
      setRouteLoad({
        dayId,
        status: result.status,
        error: result.status === 'error' ? result.error : '',
      });
    });

    return () => {
      cancelled = true;
    };
  }, [dayId, day, ensureDayLoaded]);

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

  if (!dayId || routeStatus === 'not_found') return <Navigate to="/track" replace />;
  if (routeStatus === 'error') return <RouteErrorState message={routeLoad.error} />;
  if (!day) return <RouteLoadingState title="Loading meal…" />;
  if (!meal) return <Navigate to={`/track/day/${day.id}`} replace />;

  const saveIngredient = () => {
    const id = editingId ?? uuidv7();
    const next: UpsertIngredient = {
      id,
      mealId: meal.id,
      ...draft,
      name: normalizeIngredientName(draft.name),
    };
    void upsertIngredient(day.id, meal.id, next);
    track('meal.ingredient.added', { source: draftSource });
    markSaved('ingredientForm');
    setDraft(emptyDraft);
    setDraftSource('manual');
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
    setCameraError('');
    setScanLoading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const isServings = scanForm.mode === 'servings';
      const isPackage = scanForm.mode === 'package';
      formData.append('mode', isServings ? 'servings' : 'weight');
      formData.append('entirePackage', String(isPackage));
      formData.append('weightGrams', scanForm.mode === 'weight' ? String(scanForm.amount) : '');
      formData.append('servings', isServings ? String(scanForm.amount) : '');
      formData.append('name', scanForm.name);
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const result = await api.scanNutrition(token, formData);
      track('meal.ingredient.scanned', {});
      setScanResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Scan failed';
      track('meal.ingredient.scanned.error', { error: message });
      setScanError(message);
    } finally {
      setScanLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const applyScan = () => {
    if (!scanResult || !scanResult.canApply) return;
    const { proposed } = scanResult;
    markDirty('ingredientForm');
    setDraft((prev) => ({
      ...prev,
      name: scanForm.name.trim() || (proposed.name ?? prev.name),
      weight: proposed.weight,
      calories: proposed.calories,
      fat: proposed.fat,
      saturatedFat: proposed.saturatedFat,
      carbs: proposed.carbs,
      fiber: proposed.fiber,
      protein: proposed.protein,
    }));
    setDraftSource('scanned');
    setScanResult(null);
    setScanForm({ name: '', mode: 'weight', amount: 0 });
    setEntryTab('manual');
  };

  return (
    <AnalyticsScope properties={{ dayId: day.id, mealId: meal.id }}>
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
            <div className={recipes.stack.row}>
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
            <div className={cn(recipes.stack.sm, 'mt-3')}>
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
                        track('meal.ingredient.deleted', { ingredientId: i.id });
                      }}
                    >
                      Delete ingredient
                    </Button>
                  }
                  onOpen={() => {
                    setEditingId(i.id);
                    setDraftSource('manual');
                    setEntryTab('manual');
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
        ingredientSection={
          <div className={recipes.stack.lg}>
            <Tabs
              tabs={[
                { key: 'manual', label: 'Manual Entry' },
                { key: 'scan', label: 'Label Scan' },
                { key: 'database', label: 'Nutrition Database' },
              ]}
              active={entryTab}
              onChange={(key) => {
                const next = key as 'manual' | 'scan' | 'database';
                if (next === 'database') track('meal.ingredient.database.viewed', {});
                setEntryTab(next);
              }}
              label="Ingredient entry method"
            />
            {entryTab === 'manual' ? (
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
              />
            ) : null}
            {entryTab === 'scan' ? (
              <LabelScanCard
                value={scanForm}
                loading={scanLoading}
                error={scanError || cameraError}
                onChange={setScanForm}
                onScan={openCamera}
                normalizeNameOnBlur={normalizeIngredientName}
              />
            ) : null}
            {entryTab === 'database' ? (
              <SectionCard>
                <div className="py-6 text-center">
                  <SectionHeading as="h4">Coming soon</SectionHeading>
                  <Text as="p" variant="meta">
                    Instantly look up any ingredient. Speed up your meal logging.
                  </Text>
                </div>
              </SectionCard>
            ) : null}
          </div>
        }
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
              className="w-full rounded-[10px] border border-[var(--ll-line)]"
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
          onClose={() => setScanResult(null)}
          onAccept={applyScan}
          onRetake={() => {
            setScanResult(null);
            void openCamera();
          }}
          canAccept={scanResult?.canApply ?? false}
          blockReason={scanResult?.blockReason}
          warning={scanResult?.warning}
          notes={scanResult?.notes}
          fields={
            scanResult
              ? [
                  {
                    label: 'Weight',
                    current: draft.weight,
                    proposed: scanResult.proposed.weight,
                    unit: 'g',
                  },
                  {
                    label: 'Calories',
                    current: draft.calories,
                    proposed: scanResult.proposed.calories,
                  },
                  {
                    label: 'Fat',
                    current: draft.fat,
                    proposed: scanResult.proposed.fat,
                    unit: 'g',
                  },
                  {
                    label: 'Saturated fat',
                    current: draft.saturatedFat,
                    proposed: scanResult.proposed.saturatedFat,
                    unit: 'g',
                  },
                  {
                    label: 'Carbs',
                    current: draft.carbs,
                    proposed: scanResult.proposed.carbs,
                    unit: 'g',
                  },
                  {
                    label: 'Fiber',
                    current: draft.fiber,
                    proposed: scanResult.proposed.fiber,
                    unit: 'g',
                  },
                  {
                    label: 'Protein',
                    current: draft.protein,
                    proposed: scanResult.proposed.protein,
                    unit: 'g',
                  },
                ]
              : []
          }
        />
      </MealEditTemplate>
    </AnalyticsScope>
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

  if (!profile) return <PageLoadingState label="Loading profile…" />;

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
        <div className={cn(recipes.stack.row, 'flex-wrap')}>
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
