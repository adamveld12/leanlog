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
  MonthCalendarCard,
  ProfileTemplate,
  QuickActionsCard,
  recipes,
  ReorderableList,
  SectionCard,
  Text,
  WarningText,
  WeeklyStatsCard,
  WeightTrendCard,
} from '@leanlog/ui';
import { caloriesFromMode, dayTargetsFromProfile, dayMealStructure } from '@leanlog/data-access';
import { isPastIso, normalizeIngredientName, prettyDate, todayIso } from '../lib';
import { IngredientEntry } from '../components/IngredientEntry';
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
      if (!profile || creatingRef.current) return;
      creatingRef.current = true;
      try {
        const targets = dayTargetsFromProfile(profile);
        const day = await addDay(iso, targets);
        nav(`/track/day/${day.id}`);
      } finally {
        creatingRef.current = false;
      }
    },
    [profile, addDay, nav],
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
      // react-doctor-disable-next-line react-doctor/jsx-no-jsx-as-prop
      templatesLink={
        <SectionCard title="Meal templates">
          <HelperText as="p">
            Set up the meals each new day starts with. Changes apply only to days you create
            afterward.
          </HelperText>
          <Button variant="secondary" className="w-full" onClick={() => nav('/track/templates')}>
            Edit meal templates
          </Button>
        </SectionCard>
      }
    />
  );
}

function DayDetail() {
  const { dayId } = useParams();
  const nav = useNavigate();
  const {
    days,
    profile,
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
        profileHref: '/track/profile',
        renderNavLink: renderRouterNavLink,
        rightContent: <HeaderAuthControl />,
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
                  if (!profile) return;
                  const nextTargets = dayTargetsFromProfile(profile);
                  void updateDayTargets(day.id, nextTargets);
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
          profileHref: '/track/profile',
          renderNavLink: renderRouterNavLink,
          rightContent: <HeaderAuthControl />,
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
          profileHref: '/track/profile',
          renderNavLink: renderRouterNavLink,
          rightContent: <HeaderAuthControl />,
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
        onWeightChange={(n) => patchProfileLocal({ weightLbs: Math.max(0, Math.floor(n ?? 0)) })}
        onHeightChange={(n) => patchProfileLocal({ heightInches: Math.max(0, Math.floor(n ?? 0)) })}
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
        onFatsChange={(n) => patchProfileLocal({ macroFats: Math.max(0, Math.floor(n ?? 0)) })}
        onCarbsChange={(n) => patchProfileLocal({ macroCarbs: Math.max(0, Math.floor(n ?? 0)) })}
        onProteinChange={(n) =>
          patchProfileLocal({ macroProtein: Math.max(0, Math.floor(n ?? 0)) })
        }
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

function MealTemplates() {
  const nav = useNavigate();
  const { templates, loading, addTemplate, reorderTemplates } = useStore();
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState('');

  if (loading) return <PageLoadingState label="Loading templates…" />;

  const onAdd = () => {
    const name = newName.trim();
    if (!name) return;
    addTemplate(name)
      .then(() => {
        setNewName('');
        setAddError('');
      })
      .catch((e: unknown) =>
        setAddError(e instanceof Error ? e.message : 'Could not add template'),
      );
  };

  return (
    <AnalyticsScope properties={{ page: 'MealTemplates' }}>
      <MealTemplatesTemplate
        heading={{
          title: 'Meal templates',
          backHref: '/track',
          profileHref: '/track/profile',
          renderNavLink: renderRouterNavLink,
          rightContent: <HeaderAuthControl />,
        }}
        listSection={
          <SectionCard title="Your templates">
            <HelperText as="p">
              New days copy these meals in order. Changes apply only to days created afterward.
            </HelperText>
            {templates.length ? (
              <ReorderableList
                items={templates.map((t) => ({
                  id: t.id,
                  title: t.name,
                  meta: (
                    <HelperText>
                      {t.ingredients.length
                        ? `${t.ingredients.length} default ${
                            t.ingredients.length === 1 ? 'ingredient' : 'ingredients'
                          }`
                        : 'No defaults'}
                    </HelperText>
                  ),
                  onOpen: () => nav(`/track/templates/${t.id}`),
                }))}
                onReorder={(ids) => void reorderTemplates(ids)}
              />
            ) : (
              <HelperText as="p">
                No templates yet. New days will start empty so you can add meals manually.
              </HelperText>
            )}
          </SectionCard>
        }
        addSection={
          <SectionCard title="Add template">
            <Input
              value={newName}
              placeholder="e.g. Pre-workout"
              onChange={(e) => {
                setNewName(e.target.value);
                setAddError('');
              }}
            />
            {addError ? <WarningText role="alert">{addError}</WarningText> : null}
            <Button className="w-full" disabled={!newName.trim()} onClick={onAdd}>
              Add template
            </Button>
          </SectionCard>
        }
      />
    </AnalyticsScope>
  );
}

function MealTemplateEdit() {
  const { templateId } = useParams();
  const nav = useNavigate();
  const {
    templates,
    renameTemplate,
    removeTemplate,
    upsertTemplateIngredient,
    removeTemplateIngredient,
    addTemplateIngredientFromDatabase,
    loading,
  } = useStore();
  const template = templates.find((t) => t.id === templateId);
  const [nameDraft, setNameDraft] = useState(template?.name ?? '');
  // Remember the last template we synced so we re-seed the name field when it changes. This
  // is the documented "store info from previous renders" pattern, so it must be state (an
  // eslint react-hooks/refs gate forbids reading a ref during render). react-doctor's
  // rerender-state-only-in-handlers is suppressed for this line in Step 6.
  // react-doctor-disable-next-line react-doctor/rerender-state-only-in-handlers
  const [syncedId, setSyncedId] = useState(template?.id);
  const [nameError, setNameError] = useState('');

  // Sync the name field once the template loads (or when switching templates).
  if (template && syncedId !== template.id) {
    setSyncedId(template.id);
    setNameDraft(template.name);
  }

  // Wait for the initial load before deciding the template is missing; a deep
  // link lands here before templates have streamed in.
  if (!template && loading) return <RouteLoadingState title="Loading template…" />;
  if (!templateId || !template) return <Navigate to="/track/templates" replace />;

  const saveName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === template.name) {
      setNameDraft(template.name);
      return;
    }
    void renameTemplate(template.id, trimmed)
      .then(() => setNameError(''))
      .catch((e: unknown) => {
        setNameError(e instanceof Error ? e.message : 'Could not rename template');
        setNameDraft(template.name);
      });
  };

  return (
    <AnalyticsScope properties={{ page: 'MealTemplateEdit', templateId: template.id }}>
      <MealTemplateEditTemplate
        heading={{
          title: template.name || 'Template',
          backHref: '/track/templates',
          profileHref: '/track/profile',
          renderNavLink: renderRouterNavLink,
          rightContent: <HeaderAuthControl />,
        }}
        nameSection={
          <SectionCard title="Template name">
            <Input
              value={nameDraft}
              placeholder="Template name"
              onChange={(e) => {
                setNameDraft(e.target.value);
                setNameError('');
              }}
              normalizeOnBlur={(v) => v.trim()}
              onNormalized={saveName}
            />
            {nameError ? <WarningText role="alert">{nameError}</WarningText> : null}
          </SectionCard>
        }
        ingredientsSection={
          <SectionCard title="Default ingredients">
            <HelperText as="p">
              Optional. These are copied into each new day&rsquo;s meal. Tap a row to edit.
            </HelperText>
            <IngredientEntry
              ingredients={template.ingredients}
              analyticsContext="template"
              showDatabaseCreate={false}
              onSubmit={(draft, editingId) => {
                const next = {
                  ...draft,
                  id: editingId ?? uuidv7(),
                  templateId: template.id,
                  name: normalizeIngredientName(draft.name),
                  weight: draft.weight ?? 0,
                  fat: draft.fat ?? 0,
                  saturatedFat: draft.saturatedFat ?? 0,
                  carbs: draft.carbs ?? 0,
                  fiber: draft.fiber ?? 0,
                  protein: draft.protein ?? 0,
                };
                void upsertTemplateIngredient(template.id, next);
              }}
              onDelete={(id) => void removeTemplateIngredient(template.id, id)}
              onAddFromDatabase={(dbId, input) =>
                addTemplateIngredientFromDatabase(template.id, {
                  databaseIngredientId: dbId,
                  ...input,
                })
              }
            />
          </SectionCard>
        }
        // react-doctor-disable-next-line react-doctor/jsx-no-jsx-as-prop
        dangerZone={
          <SectionCard title="Danger zone">
            <Button
              variant="danger"
              className="w-full"
              onClick={() => void removeTemplate(template.id).then(() => nav('/track/templates'))}
            >
              Delete template
            </Button>
          </SectionCard>
        }
      />
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
        path="/track/templates"
        element={
          <RequireSignedIn>
            <MealTemplates />
          </RequireSignedIn>
        }
      />
      <Route
        path="/track/templates/:templateId"
        element={
          <RequireSignedIn>
            <MealTemplateEdit />
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
