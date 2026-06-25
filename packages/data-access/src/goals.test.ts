import { describe, it, expect } from 'vitest';
import {
  resolveCoveringGoal,
  goalCoversDate,
  weightOnOrBefore,
  resolveTargetWeight,
  targetsFromGoal,
  minCalorieDelta,
  deriveDayPlan,
  buildTimeline,
  defaultSelectedSegment,
  validateNewGoal,
  findTrimmableActiveGoal,
  goalLifecycle,
  shiftIsoDate,
  katchBreakdown,
  baseCaloriesFromGoal,
  FALLBACK_WEIGHT_LBS,
} from './goals';
import type { Goal, WeightEntry } from './models';

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'g1',
    userId: 'u1',
    isBackground: false,
    name: null,
    description: null,
    mode: 'cut',
    targetWeightLbs: 180,
    macroFats: 25,
    macroCarbs: 35,
    macroProtein: 40,
    startDate: '2026-06-01',
    endDate: '2026-06-30',
    calorieDelta: 0,
    calorieBasis: 'bodyweight',
    bodyFatPct: null,
    activityLevel: null,
    mealSlots: [
      { name: 'Breakfast', ingredients: [] },
      { name: 'Lunch', ingredients: [] },
      { name: 'Dinner', ingredients: [] },
      { name: 'Snack', ingredients: [] },
    ],
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

const background = makeGoal({
  id: 'bg',
  isBackground: true,
  mode: 'maintain',
  targetWeightLbs: null,
  startDate: null,
  endDate: null,
});

const weights: WeightEntry[] = [
  { date: '2026-06-05', weightLbs: 200 },
  { date: '2026-06-12', weightLbs: 195 },
];

describe('goalCoversDate', () => {
  it('is inclusive of both ends', () => {
    const g = makeGoal({ startDate: '2026-06-01', endDate: '2026-06-30' });
    expect(goalCoversDate(g, '2026-06-01')).toBe(true);
    expect(goalCoversDate(g, '2026-06-30')).toBe(true);
    expect(goalCoversDate(g, '2026-05-31')).toBe(false);
    expect(goalCoversDate(g, '2026-07-01')).toBe(false);
  });

  it('treats null dates as open', () => {
    expect(goalCoversDate(background, '1999-01-01')).toBe(true);
    expect(goalCoversDate(background, '2200-01-01')).toBe(true);
  });
});

describe('resolveCoveringGoal', () => {
  it('prefers a user goal that covers the date (R8)', () => {
    const g = makeGoal();
    expect(resolveCoveringGoal('2026-06-15', [background, g])?.id).toBe('g1');
  });

  it('falls back to the background goal when no user goal covers (AE1)', () => {
    const g = makeGoal();
    expect(resolveCoveringGoal('2026-08-01', [background, g])?.id).toBe('bg');
  });
});

describe('weightOnOrBefore', () => {
  it('returns the latest weight on or before the date, never a future one', () => {
    expect(weightOnOrBefore(weights, '2026-06-10')).toBe(200);
    expect(weightOnOrBefore(weights, '2026-06-12')).toBe(195);
    expect(weightOnOrBefore(weights, '2026-06-01')).toBeNull();
  });
});

describe('resolveTargetWeight', () => {
  it('uses the goal target weight for user goals', () => {
    expect(resolveTargetWeight(makeGoal({ targetWeightLbs: 175 }), weights, '2026-06-15')).toBe(
      175,
    );
  });

  it('uses latest weight for the background goal (R63)', () => {
    expect(resolveTargetWeight(background, weights, '2026-06-15')).toBe(195);
  });

  it('falls back to 180 when no weight exists', () => {
    expect(resolveTargetWeight(background, [], '2026-06-15')).toBe(FALLBACK_WEIGHT_LBS);
  });
});

describe('targetsFromGoal', () => {
  it('derives Cut calories at 10x and macros from percentages (AE2)', () => {
    const t = targetsFromGoal(makeGoal({ mode: 'cut' }), 200, { applyDelta: false });
    expect(t.targetCalories).toBe(2000);
    expect(t.targetFat).toBe(Math.round((2000 * 0.25) / 9));
    expect(t.targetCarbs).toBe(Math.round((2000 * 0.35) / 4));
    expect(t.targetProtein).toBe(Math.round((2000 * 0.4) / 4));
  });

  it('uses 15x for Maintain and 16x for Lean Gain', () => {
    expect(
      targetsFromGoal(makeGoal({ mode: 'maintain' }), 200, { applyDelta: false }).targetCalories,
    ).toBe(3000);
    expect(
      targetsFromGoal(makeGoal({ mode: 'lean_gain' }), 200, { applyDelta: false }).targetCalories,
    ).toBe(3200);
  });

  it('applies the calorie delta only when asked', () => {
    const g = makeGoal({ mode: 'maintain', calorieDelta: -150 });
    expect(targetsFromGoal(g, 200, { applyDelta: true }).targetCalories).toBe(2850);
    expect(targetsFromGoal(g, 200, { applyDelta: false }).targetCalories).toBe(3000);
  });

  it('absorbs the calorie delta into carbs, leaving protein and fat fixed', () => {
    // Maintain @ 200 lb → base 3000 cal; split 25/35/40 F/C/P from makeGoal.
    const g = makeGoal({ mode: 'maintain', calorieDelta: -300 });
    const base = targetsFromGoal(g, 200, { applyDelta: false });
    const withDelta = targetsFromGoal(g, 200, { applyDelta: true });
    // Protein and fat grams are unchanged by the delta.
    expect(withDelta.targetFat).toBe(base.targetFat);
    expect(withDelta.targetProtein).toBe(base.targetProtein);
    // Carbs drop by the full delta divided by 4 kcal/g (300 / 4 = 75 g).
    expect(withDelta.targetCarbs).toBe(base.targetCarbs - 75);
    expect(withDelta.targetCalories).toBe(2700);
  });

  it('clamps carbs at 0 for an out-of-range negative delta, keeping protein and fat', () => {
    const g = makeGoal({ mode: 'maintain', calorieDelta: -100000 });
    const base = targetsFromGoal(g, 200, { applyDelta: false });
    const withDelta = targetsFromGoal(g, 200, { applyDelta: true });
    expect(withDelta.targetCarbs).toBe(0);
    expect(withDelta.targetFat).toBe(base.targetFat);
    expect(withDelta.targetProtein).toBe(base.targetProtein);
  });
});

describe('minCalorieDelta', () => {
  it('returns the carb-calorie budget as the most negative allowed delta', () => {
    // Maintain @ 200 lb → base 3000 cal; 35% carbs → 1050 carb calories.
    const g = makeGoal({ mode: 'maintain' });
    expect(minCalorieDelta(g, 200)).toBe(-1050);
  });

  it('keeps carbs at the 0 boundary at the min, and below it the UI would reject', () => {
    const g = makeGoal({ mode: 'maintain' });
    const min = minCalorieDelta(g, 200);
    expect(
      targetsFromGoal({ ...g, calorieDelta: min }, 200, { applyDelta: true }).targetCarbs,
    ).toBe(0);
    // One calorie below the min drives carbs negative pre-clamp — the value the UI blocks.
    expect(min - 1 < min).toBe(true);
  });
});

describe('katchBreakdown (#63)', () => {
  it('derives LBM, BMR, TDEE and the mode-adjusted target (AE2)', () => {
    // 200 lb, 15% body fat, Moderate (1.55), Cut (×0.80) — the spec's example.
    const b = katchBreakdown(200, 15, 'moderate', 'cut');
    expect(b.lbmKg).toBeCloseTo(77.1, 1);
    expect(Math.round(b.bmr)).toBe(2036);
    expect(Math.round(b.tdee)).toBe(3155);
    // adjustedTdee = TDEE × 0.80 → ~2524 once rounded.
    expect(Math.round(b.adjustedTdee)).toBe(2524);
  });

  it('adjusts a fixed TDEE by mode percentage (R11)', () => {
    // Athlete at a body fat that yields a known-ish chain isn't needed: assert the
    // mode factor directly by holding everything but mode constant.
    const cut = katchBreakdown(200, 20, 'sedentary', 'cut');
    const maintain = katchBreakdown(200, 20, 'sedentary', 'maintain');
    const gain = katchBreakdown(200, 20, 'sedentary', 'lean_gain');
    expect(cut.tdee).toBeCloseTo(maintain.tdee, 6);
    expect(cut.adjustedTdee).toBeCloseTo(maintain.tdee * 0.8, 6);
    expect(gain.adjustedTdee).toBeCloseTo(maintain.tdee * 1.1, 6);
  });
});

describe('baseCaloriesFromGoal (#63)', () => {
  it('uses the bodyweight multiplier for a bodyweight goal (R2)', () => {
    expect(baseCaloriesFromGoal(makeGoal({ mode: 'maintain' }), 200)).toBe(3000);
  });

  it('uses Katch mode-adjusted TDEE for a katch goal (AE2)', () => {
    const g = makeGoal({
      mode: 'cut',
      calorieBasis: 'katch',
      bodyFatPct: 15,
      activityLevel: 'moderate',
    });
    expect(baseCaloriesFromGoal(g, 200)).toBe(2524);
  });

  it('falls back to the bodyweight multiplier if a katch goal is missing body-comp', () => {
    const g = makeGoal({ mode: 'maintain', calorieBasis: 'katch' });
    expect(baseCaloriesFromGoal(g, 200)).toBe(3000);
  });
});

describe('targetsFromGoal — Katch basis (#63)', () => {
  it('derives macros from the Katch calorie target unchanged (AE10/R14)', () => {
    const g = makeGoal({
      mode: 'cut',
      calorieBasis: 'katch',
      bodyFatPct: 15,
      activityLevel: 'moderate',
      macroFats: 25,
      macroCarbs: 35,
      macroProtein: 40,
    });
    const t = targetsFromGoal(g, 200, { applyDelta: false });
    expect(t.targetCalories).toBe(2524);
    expect(t.targetFat).toBe(Math.round((2524 * 0.25) / 9));
    expect(t.targetCarbs).toBe(Math.round((2524 * 0.35) / 4));
    expect(t.targetProtein).toBe(Math.round((2524 * 0.4) / 4));
  });

  it('background Katch maintenance uses TDEE with no adjustment (AE3/R22)', () => {
    // 200 lb, 20% body fat, Sedentary (1.2), Maintain — the spec's gap-day example.
    const bg = makeGoal({
      isBackground: true,
      mode: 'maintain',
      calorieBasis: 'katch',
      bodyFatPct: 20,
      activityLevel: 'sedentary',
      startDate: null,
      endDate: null,
      targetWeightLbs: null,
    });
    const t = targetsFromGoal(bg, 200, { applyDelta: false });
    expect(t.targetCalories).toBe(2325);
  });
});

describe('deriveDayPlan', () => {
  it('applies an active goal delta today and forward but not in the past (AE3)', () => {
    const g = makeGoal({
      mode: 'maintain',
      calorieDelta: -150,
      startDate: '2026-06-01',
      endDate: null,
    });
    const onlyWeight: WeightEntry[] = [{ date: '2026-06-01', weightLbs: 200 }];
    const today = '2026-06-16';
    expect(deriveDayPlan('2026-06-16', [background, g], onlyWeight, today)?.targetCalories).toBe(
      2850,
    );
    expect(deriveDayPlan('2026-06-20', [background, g], onlyWeight, today)?.targetCalories).toBe(
      2850,
    );
    expect(deriveDayPlan('2026-06-10', [background, g], onlyWeight, today)?.targetCalories).toBe(
      3000,
    );
  });

  it('derives from weight on/before the day, ignoring later logs (Future weight scenario)', () => {
    const g = makeGoal({ mode: 'cut', startDate: '2026-06-01', endDate: '2026-06-30' });
    const w: WeightEntry[] = [
      { date: '2026-06-09', weightLbs: 200 },
      { date: '2026-06-12', weightLbs: 195 },
    ];
    expect(deriveDayPlan('2026-06-10', [background, g], w, '2026-06-16')?.targetCalories).toBe(
      2000,
    );
  });

  it('falls back to background + 180 lb with no weight and no covering goal (AE1)', () => {
    const plan = deriveDayPlan('2026-08-01', [background], [], '2026-06-16');
    expect(plan?.goalId).toBe('bg');
    expect(plan?.targetCalories).toBe(Math.ceil(180 * 15));
    expect(plan?.targetWeightLbs).toBe(180);
  });
});

describe('buildTimeline', () => {
  it('returns a single open maintenance segment when there are no user goals', () => {
    const segs = buildTimeline([background], '2026-06-16');
    expect(segs).toHaveLength(1);
    expect(segs[0]).toMatchObject({
      kind: 'maintenance',
      current: true,
      openStart: true,
      openEnd: true,
    });
  });

  it('inserts a generated maintenance gap between two goals (gap scenario)', () => {
    const cut = makeGoal({ id: 'cut', startDate: '2026-06-01', endDate: '2026-07-01' });
    const gain = makeGoal({
      id: 'gain',
      mode: 'lean_gain',
      startDate: '2026-07-15',
      endDate: '2026-08-15',
    });
    const segs = buildTimeline([background, cut, gain], '2026-07-08');
    const gap = segs.find((s) => s.kind === 'maintenance' && s.startDate === '2026-07-02');
    expect(gap).toMatchObject({ endDate: '2026-07-14', status: 'generated', current: true });
  });

  it('drops leading maintenance once the first goal has started, keeps it for a future first goal', () => {
    const past = makeGoal({ id: 'p', startDate: '2026-05-01', endDate: '2026-05-31' });
    const started = buildTimeline([background, past], '2026-06-16');
    expect(started[0]).toMatchObject({ kind: 'goal', goalId: 'p' });
    expect(started.some((s) => s.kind === 'maintenance' && s.current)).toBe(true);

    const future = makeGoal({ id: 'f', startDate: '2026-07-01', endDate: '2026-07-31' });
    const upcoming = buildTimeline([background, future], '2026-06-16');
    expect(upcoming[0]).toMatchObject({ kind: 'maintenance', current: true, openStart: true });
    expect(upcoming[1]).toMatchObject({ kind: 'goal', goalId: 'f' });
  });

  it('tags goal lifecycle status and selects the current segment', () => {
    const past = makeGoal({ id: 'past', startDate: '2026-04-01', endDate: '2026-04-30' });
    const active = makeGoal({ id: 'active', startDate: '2026-06-01', endDate: '2026-06-30' });
    const future = makeGoal({ id: 'future', startDate: '2026-08-01', endDate: '2026-08-31' });
    const segs = buildTimeline([background, past, active, future], '2026-06-16');
    expect(segs.find((s) => s.goalId === 'past')?.status).toBe('past');
    expect(segs.find((s) => s.goalId === 'active')?.status).toBe('active');
    expect(segs.find((s) => s.goalId === 'future')?.status).toBe('future');
    expect(defaultSelectedSegment(segs)?.goalId).toBe('active');
  });
});

describe('validateNewGoal', () => {
  const today = '2026-06-16';

  it('rejects a start date in the past (R23)', () => {
    expect(
      validateNewGoal(
        { startDate: '2026-06-15', endDate: null, macroFats: 25, macroCarbs: 35, macroProtein: 40 },
        [],
        today,
      ),
    ).toEqual({ code: 'start_in_past' });
  });

  it('rejects an end date not after the start (R26)', () => {
    expect(
      validateNewGoal(
        {
          startDate: '2026-07-10',
          endDate: '2026-07-10',
          macroFats: 25,
          macroCarbs: 35,
          macroProtein: 40,
        },
        [],
        today,
      ),
    ).toEqual({ code: 'end_before_start' });
  });

  it('rejects an overlapping goal (AE5)', () => {
    const existing = makeGoal({ id: 'existing', startDate: '2026-07-01', endDate: '2026-07-31' });
    expect(
      validateNewGoal(
        {
          startDate: '2026-07-15',
          endDate: '2026-08-15',
          macroFats: 25,
          macroCarbs: 35,
          macroProtein: 40,
        },
        [existing],
        today,
      ),
    ).toMatchObject({ code: 'overlap', conflictingGoalId: 'existing' });
  });

  it('allows a non-overlapping adjacent goal', () => {
    const existing = makeGoal({ id: 'existing', startDate: '2026-07-01', endDate: '2026-07-31' });
    expect(
      validateNewGoal(
        { startDate: '2026-08-01', endDate: null, macroFats: 25, macroCarbs: 35, macroProtein: 40 },
        [existing],
        today,
      ),
    ).toBeNull();
  });

  it('blocks a third future goal (AE6)', () => {
    const f1 = makeGoal({ id: 'f1', startDate: '2026-07-01', endDate: '2026-07-31' });
    const f2 = makeGoal({ id: 'f2', startDate: '2026-08-01', endDate: '2026-08-31' });
    expect(
      validateNewGoal(
        {
          startDate: '2026-09-01',
          endDate: '2026-09-30',
          macroFats: 25,
          macroCarbs: 35,
          macroProtein: 40,
        },
        [f1, f2],
        today,
      ),
    ).toEqual({ code: 'too_many_future' });
  });
});

describe('findTrimmableActiveGoal', () => {
  it('proposes trimming the active goal to the day before the new start (AE4)', () => {
    const active = makeGoal({ id: 'active', startDate: '2026-06-01', endDate: '2026-07-31' });
    const result = findTrimmableActiveGoal(
      { startDate: '2026-07-01', endDate: null, macroFats: 25, macroCarbs: 35, macroProtein: 40 },
      [active],
    );
    expect(result?.goal.id).toBe('active');
    expect(result?.trimmedEndDate).toBe('2026-06-30');
  });

  it('does not trim when the new goal starts on the active goal start (R30)', () => {
    const active = makeGoal({ id: 'active', startDate: '2026-06-16', endDate: '2026-07-31' });
    expect(
      findTrimmableActiveGoal(
        { startDate: '2026-06-16', endDate: null, macroFats: 25, macroCarbs: 35, macroProtein: 40 },
        [active],
      ),
    ).toBeNull();
  });
});

describe('goalLifecycle', () => {
  const today = '2026-06-16';
  it('classifies background, past, active, today and future (R47–R52)', () => {
    expect(goalLifecycle(background, today)).toBe('background');
    expect(goalLifecycle(makeGoal({ startDate: '2026-05-01', endDate: '2026-05-31' }), today)).toBe(
      'past',
    );
    expect(goalLifecycle(makeGoal({ startDate: '2026-06-01', endDate: '2026-06-30' }), today)).toBe(
      'active',
    );
    expect(goalLifecycle(makeGoal({ startDate: today, endDate: '2026-06-30' }), today)).toBe(
      'today',
    );
    expect(goalLifecycle(makeGoal({ startDate: '2026-07-01', endDate: '2026-07-31' }), today)).toBe(
      'future',
    );
  });
});

describe('shiftIsoDate', () => {
  it('shifts across month boundaries in UTC', () => {
    expect(shiftIsoDate('2026-07-01', -1)).toBe('2026-06-30');
    expect(shiftIsoDate('2026-06-30', 1)).toBe('2026-07-01');
  });
});
