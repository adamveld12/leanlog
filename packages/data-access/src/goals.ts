import type { Goal, GoalMode, MealSlot, WeightEntry } from './models';
import { macrosFromPercentage } from './calculations';

// Cut/Maintain/Lean Gain map to fixed latest-weight calorie multipliers (R16).
export const GOAL_MULTIPLIER: Record<GoalMode, number> = {
  cut: 10,
  maintain: 15,
  lean_gain: 16,
};

// When no weight has ever been logged, targets fall back to 180 lb (R7/R63).
export const FALLBACK_WEIGHT_LBS = 180;

// Shift an ISO date (YYYY-MM-DD) by whole days in UTC. ISO date strings also
// compare correctly lexicographically, which the range helpers rely on.
export function shiftIsoDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Inclusive coverage; a null start/end means open in that direction, which only
// the background maintenance goal uses (R6/R24/R26).
export function goalCoversDate(goal: Goal, dateIso: string): boolean {
  if (goal.startDate != null && dateIso < goal.startDate) return false;
  if (goal.endDate != null && dateIso > goal.endDate) return false;
  return true;
}

// The goal that owns a date: the user goal covering it, else the background goal
// (R8). Returns null only if no background goal exists (should never happen once
// ensureBackground has run).
export function resolveCoveringGoal(dateIso: string, goals: Goal[]): Goal | null {
  const user = goals.find((g) => !g.isBackground && goalCoversDate(g, dateIso));
  if (user) return user;
  return goals.find((g) => g.isBackground) ?? null;
}

// Latest logged weight on or before a date — never a future weight, so historical
// target derivation stays stable when later weights are logged (R17).
export function weightOnOrBefore(entries: WeightEntry[], dateIso: string): number | null {
  let best: WeightEntry | null = null;
  for (const e of entries) {
    if (e.date <= dateIso && (best == null || e.date > best.date)) best = e;
  }
  return best?.weightLbs ?? null;
}

// A goal's effective target weight: its own for user goals (always set), or the
// latest weight on/before the date (falling back to 180) for the background goal
// (R7/R63).
export function resolveTargetWeight(goal: Goal, entries: WeightEntry[], dateIso: string): number {
  if (goal.targetWeightLbs != null) return goal.targetWeightLbs;
  return weightOnOrBefore(entries, dateIso) ?? FALLBACK_WEIGHT_LBS;
}

export type GoalDayTargets = {
  targetCalories: number;
  targetFat: number;
  targetCarbs: number;
  targetProtein: number;
};

// Daily targets from a goal mode + a known body weight (R16–R18). The calorie
// delta is applied only when the caller says to (active goal, today/forward).
// Protein and fat are fixed by the macro split on the base calories; the calorie
// delta is absorbed entirely by carbs (4 kcal/g) so the user keeps their protein
// and fat targets whether cutting or surplusing.
export function targetsFromGoal(
  goal: Goal,
  latestWeightLbs: number,
  opts: { applyDelta: boolean },
): GoalDayTargets {
  const base = Math.ceil(latestWeightLbs * GOAL_MULTIPLIER[goal.mode]);
  const delta = opts.applyDelta ? goal.calorieDelta : 0;
  const { targetFat, targetProtein } = macrosFromPercentage(
    base,
    goal.macroFats,
    goal.macroCarbs,
    goal.macroProtein,
  );
  // Carbs absorb the delta; clamp at 0 so an out-of-range delta can never emit
  // negative carbs (the UI blocks that case up front, see minCalorieDelta).
  const carbCalories = Math.max(0, base * (goal.macroCarbs / 100) + delta);
  return {
    targetCalories: Math.max(0, base + delta),
    targetFat,
    targetCarbs: Math.round(carbCalories / 4),
    targetProtein,
  };
}

// Carbs absorb the calorie delta, so a delta below the goal's carb-calorie budget
// would drive carbs negative. This is the most negative delta that still keeps
// carbs ≥ 0 — the UI validates the user's entry against it.
export function minCalorieDelta(goal: Goal, latestWeightLbs: number): number {
  const base = Math.ceil(latestWeightLbs * GOAL_MULTIPLIER[goal.mode]);
  return -Math.floor(base * (goal.macroCarbs / 100));
}

export type DerivedDayPlan = GoalDayTargets & {
  goalId: string;
  targetWeightLbs: number;
  mealSlots: MealSlot[];
};

// The full client-side derivation for a day: which goal covers it, the targets
// from that goal + latest known weight, the effective target weight, and the
// meal slots to materialize. The calorie delta only applies today/forward (R22).
export function deriveDayPlan(
  dateIso: string,
  goals: Goal[],
  weightEntries: WeightEntry[],
  today: string,
): DerivedDayPlan | null {
  const goal = resolveCoveringGoal(dateIso, goals);
  if (!goal) return null;
  const latestWeight = weightOnOrBefore(weightEntries, dateIso) ?? FALLBACK_WEIGHT_LBS;
  const applyDelta = !goal.isBackground && dateIso >= today;
  return {
    goalId: goal.id,
    ...targetsFromGoal(goal, latestWeight, { applyDelta }),
    targetWeightLbs: resolveTargetWeight(goal, weightEntries, dateIso),
    mealSlots: goal.mealSlots,
  };
}

// Lifecycle state drives editability and deletability (R47–R53).
//  - background: system goal, immutable through the goals API
//  - past:       ended before today, read-only
//  - active:     started before today and still running, limited edits only
//  - today:      started today, fully editable/deletable until tomorrow
//  - future:     starts after today, fully editable/deletable
export type GoalLifecycle = 'background' | 'past' | 'active' | 'today' | 'future';

export function goalLifecycle(goal: Goal, today: string): GoalLifecycle {
  if (goal.isBackground) return 'background';
  if (goal.startDate === today) return 'today';
  if (goal.startDate != null && goal.startDate > today) return 'future';
  if (goal.endDate != null && goal.endDate < today) return 'past';
  return 'active';
}

// Fields an active (older-than-today) goal still allows (R50/R51).
export const ACTIVE_EDITABLE_FIELDS = ['name', 'description', 'endDate', 'calorieDelta'] as const;

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

export type TimelineSegmentStatus = 'past' | 'active' | 'future' | 'generated';

export type TimelineSegment = {
  kind: 'goal' | 'maintenance';
  goalId: string | null;
  startDate: string | null;
  endDate: string | null;
  status: TimelineSegmentStatus;
  // Covers today — used for the default timeline selection (R36).
  current: boolean;
  openStart: boolean;
  openEnd: boolean;
};

function goalStatus(goal: Goal, today: string): TimelineSegmentStatus {
  if (goal.endDate != null && goal.endDate < today) return 'past';
  if (goal.startDate != null && goal.startDate > today) return 'future';
  return 'active';
}

function maintenanceSegment(
  startDate: string | null,
  endDate: string | null,
  today: string,
): TimelineSegment {
  const afterStart = startDate == null || startDate <= today;
  const beforeEnd = endDate == null || endDate >= today;
  return {
    kind: 'maintenance',
    goalId: null,
    startDate,
    endDate,
    status: 'generated',
    current: afterStart && beforeEnd,
    openStart: startDate == null,
    openEnd: endDate == null,
  };
}

// Ordered timeline of user goals plus generated maintenance segments for every
// gap the background goal fills — before the first goal, between goals, and after
// the last bounded goal (R33/R42). Generated segments carry no completed outcome
// (R75); only goal segments do.
export function buildTimeline(goals: Goal[], today: string): TimelineSegment[] {
  const userGoals = goals
    .filter((g) => !g.isBackground && g.startDate != null)
    .sort((a, b) => (a.startDate! < b.startDate! ? -1 : 1));

  if (userGoals.length === 0) {
    return [maintenanceSegment(null, null, today)];
  }

  const segments: TimelineSegment[] = [];
  // Leading maintenance only when the first goal is still upcoming — i.e. it
  // represents the *current* maintenance period before that goal. Once the first
  // goal has started, the pre-history maintenance is noise and is dropped.
  const firstStart = userGoals[0].startDate!;
  if (firstStart > today) {
    segments.push(maintenanceSegment(null, shiftIsoDate(firstStart, -1), today));
  }

  userGoals.forEach((goal, i) => {
    segments.push({
      kind: 'goal',
      goalId: goal.id,
      startDate: goal.startDate,
      endDate: goal.endDate,
      status: goalStatus(goal, today),
      current: goalCoversDate(goal, today),
      openStart: false,
      openEnd: goal.endDate == null,
    });

    const next = userGoals[i + 1];
    if (goal.endDate == null) return; // open-ended goal: no following gap
    if (next) {
      const gapStart = shiftIsoDate(goal.endDate, 1);
      const gapEnd = shiftIsoDate(next.startDate!, -1);
      if (gapStart <= gapEnd) segments.push(maintenanceSegment(gapStart, gapEnd, today));
    } else if (goal.endDate < today) {
      // Trailing maintenance only when the last goal has already ended, so it
      // represents the current fallback. A future last goal gets no trailing node.
      segments.push(maintenanceSegment(shiftIsoDate(goal.endDate, 1), null, today));
    }
  });

  return segments;
}

// Default selection: the segment covering today — the active user goal or the
// active generated maintenance segment (R36).
export function defaultSelectedSegment(segments: TimelineSegment[]): TimelineSegment | null {
  return segments.find((s) => s.current) ?? null;
}

// ---------------------------------------------------------------------------
// Timeline validation (R23–R32)
// ---------------------------------------------------------------------------

export type GoalCandidate = {
  startDate: string;
  endDate: string | null;
  macroFats: number;
  macroCarbs: number;
  macroProtein: number;
};

export type GoalValidationError =
  | { code: 'start_in_past' }
  | { code: 'end_before_start' }
  | { code: 'macros_sum' }
  | { code: 'overlap'; conflictingGoalId: string }
  | { code: 'too_many_future' };

const OPEN_PAST = '0000-01-01';
const OPEN_FUTURE = '9999-12-31';

function rangesOverlap(
  aStart: string,
  aEnd: string | null,
  bStart: string | null,
  bEnd: string | null,
): boolean {
  const aE = aEnd ?? OPEN_FUTURE;
  const bS = bStart ?? OPEN_PAST;
  const bE = bEnd ?? OPEN_FUTURE;
  return aStart <= bE && bS <= aE;
}

// Validates a new user goal against the date rules and the user's existing user
// goals (R23/R26/R27/R31). The background goal is never passed in. Overlap with an
// active goal can instead be resolved via a trim (see findTrimmableActiveGoal).
export function validateNewGoal(
  candidate: GoalCandidate,
  existingUserGoals: Goal[],
  today: string,
): GoalValidationError | null {
  if (candidate.startDate < today) return { code: 'start_in_past' };
  if (candidate.endDate != null && candidate.endDate <= candidate.startDate) {
    return { code: 'end_before_start' };
  }
  if (candidate.macroFats + candidate.macroCarbs + candidate.macroProtein !== 100) {
    return { code: 'macros_sum' };
  }
  for (const g of existingUserGoals) {
    if (rangesOverlap(candidate.startDate, candidate.endDate, g.startDate, g.endDate)) {
      return { code: 'overlap', conflictingGoalId: g.id };
    }
  }
  const futureCount = existingUserGoals.filter(
    (g) => g.startDate != null && g.startDate > today,
  ).length;
  if (candidate.startDate > today && futureCount >= 2) return { code: 'too_many_future' };
  return null;
}

// When a new goal overlaps only the currently active goal by starting before its
// end, the active goal can be trimmed to the day before the new start (R28–R30).
// Returns that active goal plus the proposed trimmed end date, or null when no
// such single-overlap trim applies (e.g. it would invalidate a today-started goal,
// or more than one goal overlaps).
export function findTrimmableActiveGoal(
  candidate: GoalCandidate,
  existingUserGoals: Goal[],
): { goal: Goal; trimmedEndDate: string } | null {
  const overlapping = existingUserGoals.filter((g) =>
    rangesOverlap(candidate.startDate, candidate.endDate, g.startDate, g.endDate),
  );
  if (overlapping.length !== 1) return null;
  const active = overlapping[0];
  if (active.startDate == null || active.startDate >= candidate.startDate) return null;
  const trimmedEndDate = shiftIsoDate(candidate.startDate, -1);
  // The trim must not push the active goal's end before its own start (R30).
  if (trimmedEndDate < active.startDate) return null;
  return { goal: active, trimmedEndDate };
}
