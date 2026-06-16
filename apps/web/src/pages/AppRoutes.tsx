import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  useAuth,
  useUser,
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
  APP_NAV_LINKS,
  AppPageHeading,
  AppShell,
  BodyInfoCard,
  Button,
  CalorieTargetCard,
  CameraCaptureModal,
  cn,
  DailyTotalsCard,
  DayDetailTemplate,
  ErrorTemplate,
  DayListTemplate,
  DayWeightCard,
  FileInput,
  HelperText,
  Input,
  LandingTemplate,
  ListRow,
  LoadingState,
  MacroSummaryLine,
  MacroTargetsCard,
  MealEditTemplate,
  MealTemplatesTemplate,
  MealTemplateEditTemplate,
  Modal,
  MonthCalendarCard,
  NutritionDatabaseSearchCard,
  NutritionFactsDatabaseTemplate,
  ProfileTemplate,
  QuickActionsCard,
  recipes,
  ReorderableList,
  SectionCard,
  Text,
  ThemeToggle,
  useAnalytics,
  WarningText,
  WeeklyStatsCard,
  WeightTrendCard,
} from '@leanlog/ui';
import {
  caloriesFromMode,
  deriveDayPlan,
  dayMealStructure,
  resolveScannedMicronutrients,
  type NutritionUnit,
  type ScanResolution,
  type NutritionDatabaseIngredient,
} from '@leanlog/data-access';
import { isPastIso, normalizeIngredientName, prettyDate, todayIso } from '../lib';
import { GoalsPage } from './GoalsPage';
import { IngredientEntry } from '../components/IngredientEntry';
import { DatabaseLabelForm } from '../components/ingredient-entry/DatabaseLabelForm';
import { useDatabaseScan } from '../components/ingredient-entry/useDatabaseScan';
import { mapDbSearchResults } from '../components/ingredient-entry/types';
import {
  nutritionFactsReducer,
  initialNutritionFactsState,
  labelToEntryValue,
  NUTRITION_FACTS_PAGE_SIZE,
} from '../components/nutrition-facts/nutritionFactsReducer';
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
import type {
  UpsertIngredient,
  SaveSections,
  NutritionDatabaseIngredientSearchResult,
} from '../types';

// Resolve the manual-entry micronutrient rows (which may carry a %DV) into typed
// amounts: a measured amount wins; otherwise the %DV is converted via the Daily
// Value table. Empty / unknown-with-only-%DV rows are dropped.
function resolveDraftMicronutrients(
  micros:
    | { name: string; amount?: number | null; unit?: string; percentDailyValue?: number | null }[]
    | null
    | undefined,
) {
  return resolveScannedMicronutrients(
    micros?.map((m) => ({
      name: m.name,
      amount: m.amount ?? undefined,
      unit: (m.unit as NutritionUnit | undefined) ?? undefined,
      percentDailyValue: m.percentDailyValue ?? undefined,
    })),
  );
}

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

// Theme toggle (left) + Clerk user control (right), shown in every page header
// in place of the old Settings page (#56, R5).
function HeaderControls() {
  const [theme, setTheme] = useTheme();
  return (
    <>
      <ThemeToggle value={theme} onChange={setTheme} />
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </>
  );
}

// Goals command center (#56): timeline planner + selected-goal detail / inline
// Add Goal, inside the standard app shell with Execute/Goals nav.
function GoalsRoute() {
  return (
    <AppShell>
      <AppPageHeading
        title="Goals"
        renderNavLink={renderRouterNavLink}
        rightContent={<HeaderControls />}
      />
      <GoalsPage />
    </AppShell>
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
          // Slot prop: template renders this node in a named region (intentional composition).
          // react-doctor-disable-next-line react-doctor/jsx-no-jsx-as-prop
          cta={
            <SignInButton mode="modal">
              <Button fullWidth className="md:w-auto">
                Sign in / Sign up
              </Button>
            </SignInButton>
          }
          // react-doctor-disable-next-line react-doctor/jsx-no-jsx-as-prop
          pricing={<PricingTable />}
        />
      </SignedOut>
    </>
  );
}

function DayList() {
  const nav = useNavigate();
  const { days, profile, loading, error, addDay } = useStore();

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
  const creatingRef = useRef(false);

  // Create a day for the given ISO date (copying templates) and open it. Shared
  // by the "Log a meal" quick action and the calendar's tap-to-create.
  const createAndOpenDay = useCallback(
    async (iso: string) => {
      if (creatingRef.current) return;
      creatingRef.current = true;
      try {
        // Targets + meal slots are derived from the covering goal inside addDay (#56).
        const day = await addDay(iso);
        nav(`/track/day/${day.id}`);
      } finally {
        creatingRef.current = false;
      }
    },
    [addDay, nav],
  );

  async function handleAction() {
    if (!profile) return;
    // Log a meal: open today's day (creating it from templates if it's missing).
    if (today) {
      nav(`/track/day/${today.id}`);
      return;
    }
    await createAndOpenDay(todayIso());
  }

  if (loading) return <PageLoadingState label="Loading your days…" />;
  if (error) return <TrackerErrorState message={error} />;

  return (
    <DayListTemplate
      heading={{
        title: 'leanlog',
        navLinks: APP_NAV_LINKS,
        renderNavLink: renderRouterNavLink,
        rightContent: <HeaderControls />,
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
                  fiber: todayTotalsData.fiber,
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
                  fiber: weeklyStats.totalFiber,
                }
              : undefined
          }
          weekDayCount={weekDays.length}
          onAction={() => void handleAction()}
        />
      }
      // react-doctor-disable-next-line react-doctor/jsx-no-jsx-as-prop
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
      // react-doctor-disable-next-line react-doctor/jsx-no-jsx-as-prop
      weightTrend={
        <WeightTrendCard entries={weightEntries} goalWeightLbs={profile?.goalWeightLbs ?? null} />
      }
      // react-doctor-disable-next-line react-doctor/jsx-no-jsx-as-prop
      calendar={
        <MonthCalendarCard
          trackedDates={dateMap}
          onSelectDay={selectDay}
          onCreateDay={(iso) => void createAndOpenDay(iso)}
          emptyHint={!hasDays ? 'Start logging to fill in your calendar!' : undefined}
        />
      }
    />
  );
}

function DayDetail() {
  const { dayId } = useParams();
  const nav = useNavigate();
  const {
    days,
    goals,
    ensureDayLoaded,
    addMeal,
    removeMeal,
    logMeal,
    updateDayTargets,
    updateDayWeight,
  } = useStore();
  const { saved, markDirty, markSaved } = useSavedSections();
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
  const structure = dayMealStructure(day);
  // A day is template-backed when it has copied meals; only such days have a
  // fixed structure and per-meal logging. Ad-hoc days keep freeform meals.
  const isTemplateBacked = structure.kind === 'template';
  const isPast = isPastIso(day.date);

  return (
    <DayDetailTemplate
      heading={{
        title: prettyDate(day.date),
        backHref: '/track',
        navLinks: APP_NAV_LINKS,
        renderNavLink: renderRouterNavLink,
        rightContent: <HeaderControls />,
      }}
      weightSection={
        isPast ? undefined : (
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
        )
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
          onUpdateTargets={
            isPast
              ? undefined
              : () => {
                  // Recompute from the covering goal + latest weight on/before
                  // this day (#56, R61).
                  const plan = deriveDayPlan(
                    day.date,
                    goals,
                    selectWeightEntries(days),
                    todayIso(),
                  );
                  if (!plan) return;
                  void updateDayTargets(day.id, {
                    targetCalories: plan.targetCalories,
                    targetFat: plan.targetFat,
                    targetCarbs: plan.targetCarbs,
                    targetProtein: plan.targetProtein,
                  });
                }
          }
        />
      }
      mealsTitle={`Meals ${structure.mealsTracked} / ${structure.mealsExpected}`}
      mealsEmptyText={isPast ? 'No meals were logged this day.' : 'No meals yet. Add one below.'}
      mealsItems={day.meals.map((m) => {
        const mTotals = mealTotals(m);
        const isTemplateMeal = m.origin === 'template';
        const canLog = isTemplateMeal && !m.logged && m.ingredients.length > 0 && !isPast;
        return {
          id: m.id,
          title: m.name || 'Meal',
          meta: (
            <MacroSummaryLine
              calories={mTotals.calories}
              protein={mTotals.protein}
              carbs={mTotals.carbs}
              fat={mTotals.fat}
            />
          ),
          // Logged copied meals show a confirmation; unlogged ones read "Not logged".
          rightMetric: isTemplateMeal ? (
            <HelperText>{m.logged ? '✓ Logged' : 'Not logged'}</HelperText>
          ) : undefined,
          actions: canLog ? (
            <Button
              size="sm"
              className="min-w-[72px] shrink-0 px-3"
              onClick={(e) => {
                e.stopPropagation();
                void logMeal(day.id, m.id);
              }}
            >
              Log
            </Button>
          ) : undefined,
          onOpen: () => nav(`/track/day/${day.id}/meal/${m.id}`),
          // Copied template meals cannot be deleted (R19); ad-hoc meals can,
          // unless the day is in the past (R22).
          onDelete: isTemplateMeal || isPast ? undefined : () => void removeMeal(day.id, m.id),
          deleteLabel: 'Delete meal',
        };
      })}
      mealsControls={
        // Ad-hoc meals can only be added to zero-template days, and never to a
        // past day (R34/R36/R22).
        isTemplateBacked || isPast ? undefined : (
          <div className={cn(recipes.stack.sm, 'mb-5')}>
            <Button
              className="w-full"
              onClick={async () => {
                const meal = await addMeal(day.id, '');
                if (meal) nav(`/track/day/${day.id}/meal/${meal.id}`);
              }}
            >
              Add meal
            </Button>
          </div>
        )
      }
    />
  );
}

function MealEdit() {
  const { dayId, mealId } = useParams();
  const nav = useNavigate();
  const {
    days,
    ensureDayLoaded,
    renameMeal,
    removeMeal,
    upsertIngredient,
    removeIngredient,
    addIngredientFromDatabase,
  } = useStore();
  const day = days.find((d) => d.id === dayId);
  const meal = day?.meals.find((m) => m.id === mealId);
  const [mealNameDraft, setMealNameDraft] = useState<{ mealId: string | null; name: string }>({
    mealId: meal?.id ?? null,
    name: meal?.name ?? '',
  });
  const mealName = mealNameDraft.mealId === meal?.id ? mealNameDraft.name : (meal?.name ?? '');
  const setMealName = (name: string) => setMealNameDraft({ mealId: meal?.id ?? null, name });
  const { saved, markDirty, markSaved } = useSavedSections();

  const [routeLoad, setRouteLoad] = useState<RouteLoadState>({
    dayId: dayId ?? '',
    status: 'loading',
    error: '',
  });
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
  if (!day) return <RouteLoadingState title="Loading meal…" />;
  if (!meal) return <Navigate to={`/track/day/${day.id}`} replace />;

  // Past days are fully read-only: show the meal and its ingredients with no
  // editing, logging, or deletion affordances (R22).
  if (isPastIso(day.date)) {
    const readOnlyTotals = mealTotals(meal);
    return (
      <MealEditTemplate
        heading={{
          title: meal.name || 'Meal',
          subtitle: (
            <MacroSummaryLine
              calories={readOnlyTotals.calories}
              protein={readOnlyTotals.protein}
              carbs={readOnlyTotals.carbs}
              fat={readOnlyTotals.fat}
            />
          ),
          backHref: `/track/day/${day.id}`,
          navLinks: APP_NAV_LINKS,
          renderNavLink: renderRouterNavLink,
          rightContent: <HeaderControls />,
        }}
        mealSection={
          <SectionCard title="Meal name">
            <Text as="p" className="font-medium">
              {meal.name || 'Meal'}
            </Text>
            <HelperText as="p">This day is in the past and is read-only.</HelperText>
          </SectionCard>
        }
        ingredientSection={
          <SectionCard title="Ingredients">
            {meal.ingredients.length ? null : <HelperText as="p">No items</HelperText>}
            <div className={recipes.stack.sm}>
              {meal.ingredients.map((i) => (
                <ListRow
                  key={i.id}
                  title={i.name}
                  // react-doctor-disable-next-line react-doctor/jsx-no-jsx-as-prop
                  meta={
                    <MacroSummaryLine
                      calories={i.calories}
                      protein={i.protein}
                      carbs={i.carbs}
                      fat={i.fat}
                    />
                  }
                />
              ))}
            </div>
          </SectionCard>
        }
      />
    );
  }

  const totals = mealTotals(meal);

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
          navLinks: APP_NAV_LINKS,
          renderNavLink: renderRouterNavLink,
          rightContent: <HeaderControls />,
        }}
        mealSection={
          <SectionCard title="Meal name" saved={saved.mealName}>
            <Input
              value={mealName}
              placeholder="Meal Name"
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
          </SectionCard>
        }
        ingredientSection={
          <IngredientEntry
            ingredients={meal.ingredients}
            analyticsContext="meal"
            showDatabaseCreate
            onSubmit={(draft, editingId) => {
              const id = editingId ?? uuidv7();
              const next: UpsertIngredient = {
                ...draft,
                id,
                mealId: meal.id,
                name: normalizeIngredientName(draft.name),
                // Blank numeric fields submit as 0; the strict schema requires numbers.
                weight: draft.weight ?? 0,
                fat: draft.fat ?? 0,
                saturatedFat: draft.saturatedFat ?? 0,
                carbs: draft.carbs ?? 0,
                fiber: draft.fiber ?? 0,
                protein: draft.protein ?? 0,
                micronutrients: resolveDraftMicronutrients(draft.micronutrients),
              };
              void upsertIngredient(day.id, meal.id, next);
            }}
            onDelete={(id) => void removeIngredient(day.id, meal.id, id)}
            onAddFromDatabase={(dbId, input) =>
              addIngredientFromDatabase(day.id, meal.id, {
                databaseIngredientId: dbId,
                ...input,
              })
            }
          />
        }
      />
    </AnalyticsScope>
  );
}

function NutritionFactsDatabase() {
  const {
    browseNutritionDatabase,
    searchNutritionDatabase,
    createNutritionDatabaseIngredient,
    updateNutritionDatabaseIngredient,
    deleteNutritionDatabaseIngredient,
  } = useStore();
  const { user } = useUser();
  const track = useAnalytics();
  const [state, dispatch] = useReducer(nutritionFactsReducer, initialNutritionFactsState);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didInit = useRef(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  const ownedBy = (id: string) =>
    state.records.find((r) => r.id === id)?.addedByUserId === currentUserId;

  return (
    <AnalyticsScope properties={{ page: 'NutritionFactsDatabase' }}>
      <NutritionFactsDatabaseTemplate
        heading={{
          title: 'Nutrition Facts Database',
          backHref: '/track',
          profileHref: '/track/profile',
          renderNavLink: renderRouterNavLink,
          rightContent: <HeaderAuthControl />,
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
        <Modal
          open={confirmDeleteId != null}
          title="Delete label?"
          onClose={() => setConfirmDeleteId(null)}
        >
          <Text as="p">
            This permanently removes the saved label from the database. Ingredients already logged
            from it keep their values.
          </Text>
          <div className={recipes.stack.row}>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmDeleteId) performDelete(confirmDeleteId);
              }}
            >
              Delete
            </Button>
            <Button variant="subtle" onClick={() => setConfirmDeleteId(null)}>
              Cancel
            </Button>
          </div>
        </Modal>
      </NutritionFactsDatabaseTemplate>
    </AnalyticsScope>
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
        path="/track/nutrition-facts"
        element={
          <RequireSignedIn>
            <NutritionFactsDatabase />
          </RequireSignedIn>
        }
      />
      <Route
        path="/track/goals"
        element={
          <RequireSignedIn>
            <GoalsRoute />
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
