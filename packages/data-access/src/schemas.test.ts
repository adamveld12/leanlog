import { describe, it, expect } from 'vitest';
import {
  DailyMealLogSchema,
  DayTargetsSchema,
  UpdateProfileSchema,
  UserProfileSchema,
  PROFILE_DEFAULTS,
  CreateNutritionDatabaseIngredientSchema,
  UpsertIngredientSchema,
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

const validCreateDbIngredient = {
  name: 'Oats',
  servingAmount: 40,
  servingsPerPackage: 12,
  creationSource: 'manual' as const,
  fat: 2.5,
  carbs: 27,
  protein: 5,
  calories: 148,
};

describe('CreateNutritionDatabaseIngredientSchema', () => {
  it('rejects missing name', () => {
    const result = CreateNutritionDatabaseIngredientSchema.safeParse({
      ...validCreateDbIngredient,
      name: undefined,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = CreateNutritionDatabaseIngredientSchema.safeParse({
      ...validCreateDbIngredient,
      name: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing servingAmount', () => {
    const result = CreateNutritionDatabaseIngredientSchema.safeParse({
      ...validCreateDbIngredient,
      servingAmount: undefined,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing servingsPerPackage (R8)', () => {
    const result = CreateNutritionDatabaseIngredientSchema.safeParse({
      ...validCreateDbIngredient,
      servingsPerPackage: undefined,
    });
    expect(result.success).toBe(false);
  });

  it('defaults servingSizeUnit to gram when omitted', () => {
    const result = CreateNutritionDatabaseIngredientSchema.safeParse(validCreateDbIngredient);
    expect(result.success).toBe(true);
    expect(result.data!.servingSizeUnit).toBe('gram');
  });

  it('rejects missing fat', () => {
    const result = CreateNutritionDatabaseIngredientSchema.safeParse({
      ...validCreateDbIngredient,
      fat: undefined,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing carbs', () => {
    const result = CreateNutritionDatabaseIngredientSchema.safeParse({
      ...validCreateDbIngredient,
      carbs: undefined,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing protein', () => {
    const result = CreateNutritionDatabaseIngredientSchema.safeParse({
      ...validCreateDbIngredient,
      protein: undefined,
    });
    expect(result.success).toBe(false);
  });

  it('accepts entry without micronutrients', () => {
    const result = CreateNutritionDatabaseIngredientSchema.safeParse(validCreateDbIngredient);
    expect(result.success).toBe(true);
    expect(result.data!.micronutrients).toBeUndefined();
  });

  it('accepts a typed micronutrient amount + unit', () => {
    const result = CreateNutritionDatabaseIngredientSchema.safeParse({
      ...validCreateDbIngredient,
      micronutrients: [{ name: 'Iron', amount: 8, unit: 'milligram' }],
    });
    expect(result.success).toBe(true);
  });

  it('strips percentDailyValue and does not persist it (R4)', () => {
    const result = CreateNutritionDatabaseIngredientSchema.safeParse({
      ...validCreateDbIngredient,
      micronutrients: [
        { name: 'Vitamin D', amount: 10, unit: 'microgram', percentDailyValue: 120 },
      ],
    });
    expect(result.success).toBe(true);
    expect(result.data!.micronutrients![0]).not.toHaveProperty('percentDailyValue');
  });

  it('rejects a micronutrient missing its unit', () => {
    const result = CreateNutritionDatabaseIngredientSchema.safeParse({
      ...validCreateDbIngredient,
      micronutrients: [{ name: 'Iron', amount: 8 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a micronutrient with an untyped unit string', () => {
    const result = CreateNutritionDatabaseIngredientSchema.safeParse({
      ...validCreateDbIngredient,
      micronutrients: [{ name: 'Iron', amount: 8, unit: 'mg' }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts all optional fat subtypes', () => {
    const result = CreateNutritionDatabaseIngredientSchema.safeParse({
      ...validCreateDbIngredient,
      saturatedFat: 0.5,
      unsaturatedFat: 1.5,
      monounsaturatedFat: 0.8,
      polyunsaturatedFat: 0.7,
      transFat: 0,
      fiber: 3,
      sugar: 1,
    });
    expect(result.success).toBe(true);
  });

  it('accepts payload containing calories (now a required stored field)', () => {
    const result = CreateNutritionDatabaseIngredientSchema.safeParse({
      ...validCreateDbIngredient,
      calories: 200,
    });
    expect(result.success).toBe(true);
  });

  it('rejects payload missing calories', () => {
    const result = CreateNutritionDatabaseIngredientSchema.safeParse({
      ...validCreateDbIngredient,
      calories: undefined,
    });
    expect(result.success).toBe(false);
  });
});

describe('UpsertIngredientSchema', () => {
  it('accepts a payload containing calories (explicit override)', () => {
    const result = UpsertIngredientSchema.safeParse({
      id: 'some-id',
      mealId: 'meal-id',
      name: 'Apple',
      weight: 100,
      fat: 0,
      saturatedFat: 0,
      carbs: 25,
      fiber: 4,
      protein: 0,
      calories: 95,
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid ingredient without calories', () => {
    const result = UpsertIngredientSchema.safeParse({
      id: 'some-id',
      mealId: 'meal-id',
      name: 'Apple',
      weight: 100,
      fat: 0,
      saturatedFat: 0,
      carbs: 25,
      fiber: 4,
      protein: 0,
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Meal templates (issue #41)
// ---------------------------------------------------------------------------

import {
  MealSchema,
  MealTemplateSchema,
  CreateMealTemplateSchema,
  RenameMealTemplateSchema,
  ReorderMealTemplatesSchema,
  UpsertTemplateIngredientSchema,
} from './schemas';

describe('MealSchema origin/logged', () => {
  it('defaults origin to adhoc and logged to false when omitted', () => {
    const result = MealSchema.safeParse({
      id: 'm1',
      dailyMealLogId: 'd1',
      name: 'Breakfast',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
    expect(result.data!.origin).toBe('adhoc');
    expect(result.data!.logged).toBe(false);
  });

  it('accepts template origin with logged true', () => {
    const result = MealSchema.safeParse({
      id: 'm1',
      dailyMealLogId: 'd1',
      name: 'Breakfast',
      origin: 'template',
      logged: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
    expect(result.data!.origin).toBe('template');
  });
});

describe('MealTemplateSchema', () => {
  const base = {
    id: 't1',
    userId: 'u1',
    name: 'Breakfast',
    position: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  it('accepts a valid template with no ingredients', () => {
    const result = MealTemplateSchema.safeParse(base);
    expect(result.success).toBe(true);
    expect(result.data!.ingredients).toEqual([]);
  });

  it('rejects a blank name', () => {
    expect(MealTemplateSchema.safeParse({ ...base, name: '' }).success).toBe(false);
  });
});

describe('CreateMealTemplateSchema', () => {
  it('accepts a non-blank name', () => {
    expect(CreateMealTemplateSchema.safeParse({ name: 'Lunch' }).success).toBe(true);
  });
  it('rejects a blank name', () => {
    expect(CreateMealTemplateSchema.safeParse({ name: '' }).success).toBe(false);
  });
});

describe('RenameMealTemplateSchema', () => {
  it('rejects a blank name', () => {
    expect(RenameMealTemplateSchema.safeParse({ name: '' }).success).toBe(false);
  });
});

describe('ReorderMealTemplatesSchema', () => {
  it('accepts an ordered id list', () => {
    expect(ReorderMealTemplatesSchema.safeParse({ orderedIds: ['a', 'b', 'c'] }).success).toBe(
      true,
    );
  });
  it('accepts an empty list', () => {
    expect(ReorderMealTemplatesSchema.safeParse({ orderedIds: [] }).success).toBe(true);
  });
});

describe('UpsertTemplateIngredientSchema', () => {
  const valid = {
    id: 'i1',
    templateId: 't1',
    name: 'Eggs',
    weight: 100,
    fat: 10,
    saturatedFat: 3,
    carbs: 1,
    fiber: 0,
    protein: 12,
  };

  it('accepts a valid template ingredient (calories optional/nullable)', () => {
    expect(UpsertTemplateIngredientSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects invalid nutrition (negative protein)', () => {
    expect(UpsertTemplateIngredientSchema.safeParse({ ...valid, protein: -5 }).success).toBe(false);
  });

  it('rejects a blank name (same validity as meal ingredients)', () => {
    expect(UpsertTemplateIngredientSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });
});
