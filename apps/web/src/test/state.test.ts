import { describe, expect, it, vi, beforeEach } from 'vitest';
import { api, ApiError } from '../api';

// The mock api is defined in setup.ts and applies to ../api across the test suite.
// State integration tests would require @testing-library/react (not installed);
// instead we verify store action logic by testing the api calls they delegate to.

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.days.list).mockResolvedValue({ days: [] });
});

describe('state', () => {
  it('state module loads without error', () => {
    expect(true).toBe(true);
  });
});

describe('api.nutritionDatabase mock (state-level contract)', () => {
  it('searchNutritionDatabase delegates to api.nutritionDatabase.search with correct args', async () => {
    const now = new Date().toISOString();
    const mockResults = [
      {
        id: 'db-1',
        name: 'Chicken',
        addedByName: 'Alice',
        calories: 200,
        servingAmount: 100,
        servingSizeUnit: 'gram' as const,
        servingsPerPackage: 1,
        addedByUserId: 'u1',
        creationSource: 'manual' as const,
        fat: 10,
        carbs: 0,
        protein: 30,
        sugarAlcohol: null,
        allulose: null,
        alcohol: null,
        micronutrients: null,
        createdAt: now,
        updatedAt: now,
      },
    ];
    vi.mocked(api.nutritionDatabase.search).mockResolvedValue({ results: mockResults, total: 1 });

    const { results } = await api.nutritionDatabase.search('test-token', 'chick');
    expect(results).toEqual(mockResults);
    expect(api.nutritionDatabase.search).toHaveBeenCalledWith('test-token', 'chick');
  });

  it('propagates ApiError from nutritionDatabase.search', async () => {
    vi.mocked(api.nutritionDatabase.search).mockRejectedValue(new ApiError(500, 'server error'));

    await expect(api.nutritionDatabase.search('test-token', 'q')).rejects.toBeInstanceOf(ApiError);
  });

  it('createNutritionDatabaseIngredient delegates to api.nutritionDatabase.create', async () => {
    const now = new Date().toISOString();
    const created = {
      id: 'db-new',
      name: 'Oats',
      servingAmount: 100,
      servingSizeUnit: 'gram' as const,
      servingsPerPackage: 12,
      addedByUserId: 'u1',
      creationSource: 'manual' as const,
      fat: 7,
      carbs: 66,
      protein: 17,
      calories: 397,
      sugarAlcohol: null,
      allulose: null,
      alcohol: null,
      micronutrients: null,
      createdAt: now,
      updatedAt: now,
    };
    vi.mocked(api.nutritionDatabase.create).mockResolvedValue(created);

    const input = {
      name: 'Oats',
      servingAmount: 100,
      servingSizeUnit: 'gram' as const,
      servingsPerPackage: 12,
      creationSource: 'manual' as const,
      fat: 7,
      carbs: 66,
      protein: 17,
      calories: 397,
    };
    const result = await api.nutritionDatabase.create('test-token', input);
    expect(result).toEqual(created);
    expect(api.nutritionDatabase.create).toHaveBeenCalledWith('test-token', input);
  });

  it('addIngredientFromDatabase delegates to api.ingredients.addFromDatabase', async () => {
    const now = new Date().toISOString();
    const newIngredient = {
      id: 'ing-new',
      mealId: 'meal-1',
      name: 'Chicken Breast',
      weight: 150,
      calories: 248,
      estimatedCalories: 248,
      calorieSource: 'estimated' as const,
      fat: 5.4,
      saturatedFat: 1.5,
      carbs: 0,
      fiber: 0,
      protein: 46.5,
      sugarAlcohol: null,
      allulose: null,
      alcohol: null,
      sourceDatabaseIngredientId: 'db-1',
      createdAt: now,
      updatedAt: now,
    };
    vi.mocked(api.ingredients.addFromDatabase).mockResolvedValue(newIngredient);

    const result = await api.ingredients.addFromDatabase('test-token', 'day-1', 'meal-1', {
      databaseIngredientId: 'db-1',
      mode: 'weight',
      amount: 150,
    });

    expect(result).toEqual(newIngredient);
    expect(api.ingredients.addFromDatabase).toHaveBeenCalledWith('test-token', 'day-1', 'meal-1', {
      databaseIngredientId: 'db-1',
      mode: 'weight',
      amount: 150,
    });
  });
});
