import { describe, expect, it } from 'vitest';
import type { DailyMealLog } from '@leanlog/data-access';
import {
  dayTotals,
  mealTotals,
  daysThisWeek,
  daysLast90,
  todayLog,
  trackedDatesMap,
  aggregateStats,
  selectWeightEntries,
  selectVTaperEntries,
  selectWaistEntries,
  selectNorthStar,
  selectWeeklyWeightDelta,
  selectWeeklyWeightEntries,
  selectLatestMeasurements,
  selectMeasurementsDue,
} from '../selectors';

const now = new Date().toISOString();

function makeDay(overrides: Partial<DailyMealLog> = {}): DailyMealLog {
  return {
    id: 'd',
    userId: 'u1',
    date: '2026-01-01',
    targetCalories: 2700,
    targetFat: 75,
    targetCarbs: 236,
    targetProtein: 270,
    mealCountTarget: 4,
    weightLbs: null,
    shoulderInches: null,
    waistInches: null,
    bicepInches: null,
    thighInches: null,
    meals: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('selectors', () => {
  it('sums meal totals', () => {
    const meal = {
      id: 'm',
      dailyMealLogId: 'd',
      origin: 'adhoc' as const,
      logged: false,
      name: 'X',
      createdAt: now,
      updatedAt: now,
      ingredients: [
        {
          id: '1',
          mealId: 'm',
          name: 'A',
          weight: 1,
          calories: 10,
          estimatedCalories: 10,
          calorieSource: 'estimated' as const,
          fat: 1,
          saturatedFat: 0,
          carbs: 2,
          fiber: 0,
          protein: 3,
          sugarAlcohol: null,
          allulose: null,
          alcohol: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: '2',
          mealId: 'm',
          name: 'B',
          weight: 1,
          calories: 20,
          estimatedCalories: 20,
          calorieSource: 'estimated' as const,
          fat: 2,
          saturatedFat: 0,
          carbs: 4,
          fiber: 0,
          protein: 6,
          sugarAlcohol: null,
          allulose: null,
          alcohol: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    };
    expect(mealTotals(meal).calories).toBe(30);
    expect(dayTotals(makeDay({ meals: [meal] })).protein).toBe(9);
  });
});

describe('daysThisWeek', () => {
  it('filters to Monday-Sunday of reference date', () => {
    // 2026-05-25 is a Monday, 2026-05-31 is a Sunday
    const mon = makeDay({ id: 'mon', date: '2026-05-25' });
    const wed = makeDay({ id: 'wed', date: '2026-05-27' });
    const sun = makeDay({ id: 'sun', date: '2026-05-31' });
    const prevSun = makeDay({ id: 'prev', date: '2026-05-24' });
    const nextMon = makeDay({ id: 'next', date: '2026-06-01' });

    const result = daysThisWeek([mon, wed, sun, prevSun, nextMon], '2026-05-27');
    const ids = result.map((d) => d.id);
    expect(ids).toContain('mon');
    expect(ids).toContain('wed');
    expect(ids).toContain('sun');
    expect(ids).not.toContain('prev');
    expect(ids).not.toContain('next');
  });

  it('handles Sunday reference date correctly', () => {
    // 2026-05-31 is Sunday — should still be in Mon 5/25 - Sun 5/31 week
    const mon = makeDay({ id: 'mon', date: '2026-05-25' });
    const sun = makeDay({ id: 'sun', date: '2026-05-31' });
    const nextMon = makeDay({ id: 'next', date: '2026-06-01' });

    const result = daysThisWeek([mon, sun, nextMon], '2026-05-31');
    expect(result.map((d) => d.id)).toEqual(['mon', 'sun']);
  });
});

describe('daysLast90', () => {
  it('includes today and 89 days back', () => {
    const today = makeDay({ id: 'today', date: '2026-05-27' });
    const day89 = makeDay({ id: 'day89', date: '2026-02-27' });
    const day91 = makeDay({ id: 'day91', date: '2026-02-25' });

    const result = daysLast90([today, day89, day91], '2026-05-27');
    expect(result.map((d) => d.id)).toContain('today');
    expect(result.map((d) => d.id)).toContain('day89');
    expect(result.map((d) => d.id)).not.toContain('day91');
  });
});

describe('todayLog', () => {
  it('returns matching day for today', () => {
    const todayDate = new Date();
    const y = todayDate.getFullYear();
    const m = String(todayDate.getMonth() + 1).padStart(2, '0');
    const d = String(todayDate.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${d}`;

    const day = makeDay({ id: 'today', date: iso });
    expect(todayLog([day])?.id).toBe('today');
  });

  it('returns undefined when no match', () => {
    const day = makeDay({ date: '2020-01-01' });
    expect(todayLog([day])).toBeUndefined();
  });
});

describe('trackedDatesMap', () => {
  it('builds date to id map', () => {
    const days = [
      makeDay({ id: 'a', date: '2026-05-25' }),
      makeDay({ id: 'b', date: '2026-05-26' }),
    ];
    const map = trackedDatesMap(days);
    expect(map.get('2026-05-25')).toBe('a');
    expect(map.get('2026-05-26')).toBe('b');
    expect(map.size).toBe(2);
  });
});

describe('aggregateStats', () => {
  it('aggregates across multiple days', () => {
    const meal = {
      id: 'm',
      dailyMealLogId: 'd',
      origin: 'adhoc' as const,
      logged: false,
      name: 'X',
      createdAt: now,
      updatedAt: now,
      ingredients: [
        {
          id: '1',
          mealId: 'm',
          name: 'A',
          weight: 100,
          calories: 500,
          estimatedCalories: 500,
          calorieSource: 'estimated' as const,
          fat: 20,
          saturatedFat: 5,
          carbs: 50,
          fiber: 5,
          protein: 30,
          sugarAlcohol: null,
          allulose: null,
          alcohol: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    };

    const days = [
      makeDay({
        id: 'd1',
        targetCalories: 2000,
        targetFat: 60,
        targetCarbs: 250,
        targetProtein: 150,
        mealCountTarget: 3,
        meals: [meal, meal],
      }),
      makeDay({
        id: 'd2',
        targetCalories: 2000,
        targetFat: 60,
        targetCarbs: 250,
        targetProtein: 150,
        mealCountTarget: 3,
        meals: [meal, meal, meal],
      }),
    ];

    const result = aggregateStats(days);
    expect(result.totalCalories).toBe(2500);
    expect(result.mealsTracked).toBe(5);
    expect(result.mealsExpected).toBe(6);
    expect(result.coverage).toBe(83);
  });

  it('returns zeros for empty days', () => {
    const result = aggregateStats([]);
    expect(result.accuracy.overall).toBe(0);
    expect(result.coverage).toBe(0);
  });

  it('computes totalFiber and totalNetCarbs', () => {
    const meal = {
      id: 'm',
      dailyMealLogId: 'd',
      origin: 'adhoc' as const,
      logged: false,
      name: 'X',
      createdAt: now,
      updatedAt: now,
      ingredients: [
        {
          id: '1',
          mealId: 'm',
          name: 'A',
          weight: 100,
          calories: 500,
          estimatedCalories: 500,
          calorieSource: 'estimated' as const,
          fat: 20,
          saturatedFat: 5,
          carbs: 50,
          fiber: 5,
          protein: 30,
          sugarAlcohol: null,
          allulose: null,
          alcohol: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    };
    const day = makeDay({
      id: 'd1',
      targetCalories: 2000,
      targetFat: 60,
      targetCarbs: 250,
      targetProtein: 150,
      mealCountTarget: 3,
      meals: [meal, meal],
    });
    const result = aggregateStats([day, day]);
    expect(result.totalFiber).toBe(20); // 5 * 4 meals
    expect(result.totalNetCarbs).toBe(180); // (50-5)*4
  });

  it('clamps totalNetCarbs to 0 when fiber exceeds carbs', () => {
    const highFiberMeal = {
      id: 'm',
      dailyMealLogId: 'd',
      origin: 'adhoc' as const,
      logged: false,
      name: 'X',
      createdAt: now,
      updatedAt: now,
      ingredients: [
        {
          id: '1',
          mealId: 'm',
          name: 'A',
          weight: 100,
          calories: 200,
          estimatedCalories: 200,
          calorieSource: 'estimated' as const,
          fat: 5,
          saturatedFat: 0,
          carbs: 5,
          fiber: 10,
          protein: 10,
          sugarAlcohol: null,
          allulose: null,
          alcohol: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    };
    const day = makeDay({ meals: [highFiberMeal] });
    const result = aggregateStats([day]);
    expect(result.totalNetCarbs).toBe(0);
  });

  it('computes carb accuracy from total carbs, not net carbs', () => {
    // carbs=50, fiber=40 → netCarbs=10, totalCarbs=50, target=50.
    // Net-carb accuracy would be macroAccuracy(10, 50) = 0%; total-carb
    // accuracy is macroAccuracy(50, 50) = 100%. Guards against a regression
    // back to net carbs driving the accuracy metric.
    const meal = {
      id: 'm',
      dailyMealLogId: 'd',
      origin: 'adhoc' as const,
      logged: false,
      name: 'X',
      createdAt: now,
      updatedAt: now,
      ingredients: [
        {
          id: '1',
          mealId: 'm',
          name: 'A',
          weight: 100,
          calories: 200,
          estimatedCalories: 200,
          calorieSource: 'estimated' as const,
          fat: 5,
          saturatedFat: 0,
          carbs: 50,
          fiber: 40,
          protein: 10,
          sugarAlcohol: null,
          allulose: null,
          alcohol: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    };
    const day = makeDay({ targetCarbs: 50, meals: [meal] });
    const result = aggregateStats([day]);
    expect(result.accuracy.carbs).toBe(100);
  });
});

describe('selectWeightEntries', () => {
  it('filters out days without a logged weight', () => {
    const days = [
      makeDay({ id: 'a', date: '2026-05-26', weightLbs: 182 }),
      makeDay({ id: 'b', date: '2026-05-27' }),
      makeDay({ id: 'c', date: '2026-05-28', weightLbs: 181 }),
    ];
    const entries = selectWeightEntries(days);
    expect(entries).toEqual([
      { date: '2026-05-26', weightLbs: 182 },
      { date: '2026-05-28', weightLbs: 181 },
    ]);
  });

  it('sorts entries ascending by date', () => {
    const days = [
      makeDay({ id: 'a', date: '2026-05-28', weightLbs: 181 }),
      makeDay({ id: 'b', date: '2026-05-26', weightLbs: 182 }),
      makeDay({ id: 'c', date: '2026-05-27', weightLbs: 181.5 }),
    ];
    const entries = selectWeightEntries(days);
    expect(entries.map((e) => e.date)).toEqual(['2026-05-26', '2026-05-27', '2026-05-28']);
  });
});

describe('measurement selectors (#68)', () => {
  it('selectVTaperEntries yields one rounded point per day with both sites', () => {
    const days = [
      makeDay({ id: 'a', date: '2026-05-26', shoulderInches: 50, waistInches: 32 }),
      makeDay({ id: 'b', date: '2026-05-27', waistInches: 33 }), // shoulder missing → skipped
      makeDay({ id: 'c', date: '2026-05-28', shoulderInches: 51, waistInches: 31 }),
    ];
    expect(selectVTaperEntries(days)).toEqual([
      { date: '2026-05-26', value: 1.56 },
      { date: '2026-05-28', value: 1.65 },
    ]);
  });

  it('selectWaistEntries yields a point per day with a waist, sorted by date', () => {
    const days = [
      makeDay({ id: 'a', date: '2026-05-28', waistInches: 31 }),
      makeDay({ id: 'b', date: '2026-05-26', waistInches: 33 }),
      makeDay({ id: 'c', date: '2026-05-27' }), // no waist → skipped
    ];
    expect(selectWaistEntries(days)).toEqual([
      { date: '2026-05-26', value: 33 },
      { date: '2026-05-28', value: 31 },
    ]);
  });

  it('selectNorthStar uses the most recent day with both sites and judges the target', () => {
    const days = [
      makeDay({ id: 'a', date: '2026-05-26', shoulderInches: 50, waistInches: 32 }),
      makeDay({ id: 'b', date: '2026-05-28', shoulderInches: 51, waistInches: 31 }),
    ];
    expect(selectNorthStar(days)).toEqual({
      currentVTaper: 1.65,
      target: 1.6,
      gapToTarget: 0,
      met: true,
    });
  });

  it('selectNorthStar returns null before any day has both sites (prompt state)', () => {
    const days = [makeDay({ id: 'a', date: '2026-05-26', waistInches: 32 })];
    expect(selectNorthStar(days)).toBeNull();
  });

  it('selectWeeklyWeightDelta measures last-7 vs prior-7 around an explicit today', () => {
    const days = [
      makeDay({ id: '1', date: '2026-06-26', weightLbs: 199 }),
      makeDay({ id: '2', date: '2026-06-25', weightLbs: 199 }),
      makeDay({ id: '3', date: '2026-06-19', weightLbs: 201 }),
      makeDay({ id: '4', date: '2026-06-18', weightLbs: 201 }),
    ];
    expect(selectWeeklyWeightDelta(days, '2026-06-26')?.deltaLbs).toBe(-2);
  });

  it('selectWeeklyWeightDelta is null with too few weigh-ins', () => {
    const days = [makeDay({ id: '1', date: '2026-06-26', weightLbs: 199 })];
    expect(selectWeeklyWeightDelta(days, '2026-06-26')).toBeNull();
  });

  it('selectWeeklyWeightEntries buckets weigh-ins into Monday-dated averages', () => {
    const days = [
      makeDay({ id: '1', date: '2026-06-22', weightLbs: 200 }),
      makeDay({ id: '2', date: '2026-06-24', weightLbs: 198 }),
    ];
    expect(selectWeeklyWeightEntries(days)).toEqual([{ date: '2026-06-22', weightLbs: 199 }]);
  });

  // A day carrying a complete four-site set.
  const complete = (id: string, date: string) =>
    makeDay({ id, date, shoulderInches: 50, waistInches: 32, bicepInches: 15, thighInches: 23 });

  it('selectLatestMeasurements returns the most-recent complete set, ignoring partial days', () => {
    const days = [
      complete('a', '2026-06-10'),
      makeDay({ id: 'b', date: '2026-06-20', shoulderInches: 51, waistInches: 31 }), // partial → ignored
      complete('c', '2026-06-15'),
    ];
    expect(selectLatestMeasurements(days)).toEqual({
      date: '2026-06-15',
      shoulderInches: 50,
      waistInches: 32,
      bicepInches: 15,
      thighInches: 23,
      vTaper: 1.56,
    });
  });

  it('selectLatestMeasurements is null until a full set exists', () => {
    expect(
      selectLatestMeasurements([makeDay({ id: 'a', date: '2026-06-10', waistInches: 32 })]),
    ).toBeNull();
  });

  it('selectMeasurementsDue: complete set within the last 7 days is not due (boundary today-6)', () => {
    const today = '2026-06-26';
    expect(selectMeasurementsDue([complete('a', '2026-06-26')], today)).toBe(false);
    expect(selectMeasurementsDue([complete('a', '2026-06-20')], today)).toBe(false); // today-6
  });

  it('selectMeasurementsDue: a 7-day-old complete set is due (boundary today-7)', () => {
    expect(selectMeasurementsDue([complete('a', '2026-06-19')], '2026-06-26')).toBe(true);
  });

  it('selectMeasurementsDue: a brand-new user is due', () => {
    expect(selectMeasurementsDue([], '2026-06-26')).toBe(true);
  });

  it('selectMeasurementsDue: a partial set in the window does not satisfy the cadence', () => {
    const days = [makeDay({ id: 'a', date: '2026-06-25', shoulderInches: 50, waistInches: 32 })];
    expect(selectMeasurementsDue(days, '2026-06-26')).toBe(true);
  });
});
