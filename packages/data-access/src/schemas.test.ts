import { describe, it, expect } from 'vitest';
import {
  DailyMealLogSchema,
  DayTargetsSchema,
  UpdateProfileSchema,
  UserProfileSchema,
  PROFILE_DEFAULTS,
} from './schemas';

describe('UpdateProfileSchema', () => {
  it('partial input contains only provided fields — no defaults leak', () => {
    const result = UpdateProfileSchema.safeParse({ macroMode: 'custom' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ macroMode: 'custom' });
    expect(Object.keys(result.data!)).toHaveLength(1);
  });

  it('single weight update contains only weightLbs', () => {
    const result = UpdateProfileSchema.safeParse({ weightLbs: 190 });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ weightLbs: 190 });
  });

  it('empty input is valid (no-op update)', () => {
    const result = UpdateProfileSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data).toEqual({});
  });

  it('full valid input passes', () => {
    const input = {
      weightLbs: 190,
      heightInches: 68,
      calorieMode: 'deficit' as const,
      targetCalories: null,
      macroMode: 'custom' as const,
      macroFats: 30,
      macroCarbs: 40,
      macroProtein: 30,
      goalWeightLbs: null,
      goalBodyFatPct: null,
    };
    const result = UpdateProfileSchema.safeParse(input);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(input);
  });

  it('rejects invalid calorieMode', () => {
    const result = UpdateProfileSchema.safeParse({ calorieMode: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid macroMode', () => {
    const result = UpdateProfileSchema.safeParse({ macroMode: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('rejects negative weightLbs', () => {
    const result = UpdateProfileSchema.safeParse({ weightLbs: -1 });
    expect(result.success).toBe(false);
  });
});

describe('DayTargetsSchema', () => {
  it('accepts a weight-only PATCH', () => {
    const result = DayTargetsSchema.safeParse({ weightLbs: 182 });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ weightLbs: 182 });
  });

  it('rejects null weightLbs (clearing is not supported)', () => {
    const result = DayTargetsSchema.safeParse({ weightLbs: null });
    expect(result.success).toBe(false);
  });

  it('rejects zero or negative weightLbs', () => {
    expect(DayTargetsSchema.safeParse({ weightLbs: 0 }).success).toBe(false);
    expect(DayTargetsSchema.safeParse({ weightLbs: -1 }).success).toBe(false);
  });

  it('allows partial target updates without weight', () => {
    const result = DayTargetsSchema.safeParse({ targetCalories: 2100 });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ targetCalories: 2100 });
  });
});

describe('DailyMealLogSchema', () => {
  it('defaults weightLbs to null when omitted', () => {
    const result = DailyMealLogSchema.safeParse({
      id: 'd',
      userId: 'u',
      date: '2026-05-28',
      targetCalories: 2000,
      targetFat: 70,
      targetCarbs: 250,
      targetProtein: 140,
      createdAt: '2026-05-28T00:00:00.000Z',
      updatedAt: '2026-05-28T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
    expect(result.data!.weightLbs).toBeNull();
  });

  it('accepts a positive weightLbs value', () => {
    const result = DailyMealLogSchema.safeParse({
      id: 'd',
      userId: 'u',
      date: '2026-05-28',
      targetCalories: 2000,
      targetFat: 70,
      targetCarbs: 250,
      targetProtein: 140,
      weightLbs: 182,
      createdAt: '2026-05-28T00:00:00.000Z',
      updatedAt: '2026-05-28T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
    expect(result.data!.weightLbs).toBe(182);
  });
});

describe('PROFILE_DEFAULTS', () => {
  it('matches UserProfileSchema defaults', () => {
    const parsed = UserProfileSchema.safeParse({
      id: 'test',
      clerkUserId: 'clerk-test',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data!.weightLbs).toBe(PROFILE_DEFAULTS.weightLbs);
    expect(parsed.data!.heightInches).toBe(PROFILE_DEFAULTS.heightInches);
    expect(parsed.data!.calorieMode).toBe(PROFILE_DEFAULTS.calorieMode);
    expect(parsed.data!.macroMode).toBe(PROFILE_DEFAULTS.macroMode);
    expect(parsed.data!.macroFats).toBe(PROFILE_DEFAULTS.macroFats);
    expect(parsed.data!.macroCarbs).toBe(PROFILE_DEFAULTS.macroCarbs);
    expect(parsed.data!.macroProtein).toBe(PROFILE_DEFAULTS.macroProtein);
  });
});
