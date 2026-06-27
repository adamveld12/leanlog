import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createContext, use, useState, type PropsWithChildren } from 'react';
import App from '../App';
import { api } from '../api';
import { todayIso } from '../lib';
import type { DailyMealLog, Ingredient, UserProfile } from '@leanlog/data-access';
import type { ScanResolution } from '@leanlog/data-access';

vi.mock('react-chartjs-2', () => ({ Line: () => null }));

// optimizeImage relies on canvas/createImageBitmap which jsdom lacks; stub it to
// pass the blob through untouched while keeping the real nutritionImageUrl so
// thumbnails/photo slots still resolve their src.
vi.mock('../image', async (importActual) => {
  const actual = await importActual<typeof import('../image')>();
  return { ...actual, optimizeImage: vi.fn((blob: Blob) => Promise.resolve(blob)) };
});

function makeIngredient(
  overrides: Partial<Ingredient> &
    Pick<
      Ingredient,
      | 'id'
      | 'mealId'
      | 'name'
      | 'weight'
      | 'calories'
      | 'fat'
      | 'saturatedFat'
      | 'carbs'
      | 'fiber'
      | 'protein'
    >,
): Ingredient {
  const now = new Date().toISOString();
  return {
    estimatedCalories: overrides.calories ?? 0,
    calorieSource: 'estimated' as const,
    sugarAlcohol: null,
    allulose: null,
    alcohol: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// jsdom does not implement HTMLDialogElement.showModal / close; polyfill them so
// Modal components can open/close without throwing.
beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function () {
      this.open = false;
    };
  }
});

const now = new Date().toISOString();
const fakeDbTotal = 42;

const mockProfile: UserProfile = {
  id: 'p1',
  clerkUserId: 'user_test',
  weightLbs: 180,
  heightInches: 72,
  calorieMode: 'maintenance',
  targetCalories: null,
  macroMode: 'percentage',
  macroFats: 25,
  macroCarbs: 35,
  macroProtein: 40,
  goalWeightLbs: null,
  goalBodyFatPct: null,
  createdAt: now,
  updatedAt: now,
};

type StoreCtx = {
  days: DailyMealLog[];
  profile: UserProfile;
  loading: boolean;
  error: null;
  ensureDayLoaded: (
    dayId: string,
  ) => Promise<{ status: 'found'; day: DailyMealLog } | { status: 'not_found' }>;
  addDay: (...args: unknown[]) => Promise<void>;
  removeDay: (id: string) => Promise<void>;
  addMeal: (...args: unknown[]) => Promise<null>;
  removeMeal: (...args: unknown[]) => Promise<void>;
  renameMeal: (...args: unknown[]) => Promise<void>;
  upsertIngredient: (...args: unknown[]) => Promise<void>;
  removeIngredient: (dayId: string, mealId: string, ingredientId: string) => Promise<void>;
  addIngredientFromDatabase: (
    dayId: string,
    mealId: string,
    input: { databaseIngredientId: string; mode: string; amount?: number },
  ) => Promise<void>;
  searchNutritionDatabase: (query: string) => Promise<{ results: unknown[]; total: number }>;
  createNutritionDatabaseIngredient: (input: unknown) => Promise<unknown>;
  updateDayTargets: (...args: unknown[]) => Promise<void>;
  updateDayWeight: (...args: unknown[]) => Promise<void>;
  patchProfileLocal: (data: Partial<UserProfile>) => void;
  updateProfile: (...args: unknown[]) => Promise<void>;
};

const FakeStoreCtx = createContext<StoreCtx | null>(null);

function FakeStateProvider({
  children,
  initialDays,
  onAddIngredientFromDatabase,
  onCreateIngredient,
  onSearch,
  onUpsertIngredient,
}: PropsWithChildren<{
  initialDays: DailyMealLog[];
  onAddIngredientFromDatabase?: (
    dayId: string,
    mealId: string,
    input: { databaseIngredientId: string; mode: string; amount?: number },
  ) => Promise<void>;
  onCreateIngredient?: (input: unknown) => Promise<unknown>;
  onSearch?: (query: string) => Promise<unknown[]>;
  onUpsertIngredient?: (dayId: string, mealId: string, ingredient: unknown) => Promise<void>;
}>) {
  const [days, setDays] = useState<DailyMealLog[]>(initialDays);

  const store: StoreCtx = {
    days,
    profile: mockProfile,
    loading: false,
    error: null,
    ensureDayLoaded: async (dayId: string) => {
      const day = days.find((d) => d.id === dayId);
      return day ? { status: 'found', day } : { status: 'not_found' };
    },
    addDay: async () => {},
    removeDay: async (id: string) => {
      setDays((prev) => prev.filter((d) => d.id !== id));
    },
    addMeal: async () => null,
    removeMeal: async () => {},
    renameMeal: async () => {},
    upsertIngredient: async (...args: unknown[]) => {
      const [dayId, mealId, ingredient] = args as [string, string, Ingredient];
      if (onUpsertIngredient) await onUpsertIngredient(dayId, mealId, ingredient);
      setDays((prev) =>
        prev.map((d) =>
          d.id === dayId
            ? {
                ...d,
                meals: d.meals.map((m) =>
                  m.id === mealId
                    ? {
                        ...m,
                        ingredients: m.ingredients.map((i) =>
                          i.id === ingredient.id ? { ...i, ...ingredient } : i,
                        ),
                      }
                    : m,
                ),
              }
            : d,
        ),
      );
    },
    removeIngredient: async () => {},
    addIngredientFromDatabase: async (dayId, mealId, input) => {
      if (onAddIngredientFromDatabase) {
        await onAddIngredientFromDatabase(dayId, mealId, input);
      }
      // Append a stub ingredient to the meal
      const newIngredient: Ingredient = makeIngredient({
        id: `db-ingredient-${input.databaseIngredientId}`,
        mealId,
        name: 'DB INGREDIENT',
        weight: input.amount ?? 0,
        calories: 200,
        fat: 5,
        saturatedFat: 1,
        carbs: 20,
        fiber: 2,
        protein: 10,
      });
      setDays((prev) =>
        prev.map((d) =>
          d.id === dayId
            ? {
                ...d,
                meals: d.meals.map((m) =>
                  m.id === mealId ? { ...m, ingredients: [...m.ingredients, newIngredient] } : m,
                ),
              }
            : d,
        ),
      );
    },
    searchNutritionDatabase: async (query: string) => {
      // Mirrors the real client: short queries only seed the total, no search
      if (query.trim().length < 2) return { results: [], total: fakeDbTotal };
      const results = onSearch ? await onSearch(query) : [];
      return { results, total: fakeDbTotal };
    },
    createNutritionDatabaseIngredient: async (input: unknown) => {
      if (onCreateIngredient) return onCreateIngredient(input);
      return {};
    },
    updateDayTargets: async () => {},
    updateDayWeight: async () => {},
    patchProfileLocal: () => {},
    updateProfile: async () => {},
  };

  return <FakeStoreCtx.Provider value={store}>{children}</FakeStoreCtx.Provider>;
}

vi.mock('../state', () => ({
  StateProvider: ({ children }: PropsWithChildren) => <>{children}</>,
  useStore: () => {
    const ctx = use(FakeStoreCtx);
    if (!ctx) throw new Error('FakeStoreCtx not provided');
    return ctx;
  },
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{location.pathname}</div>;
}

function renderApp(
  route: string,
  initialDays: DailyMealLog[],
  handlers: {
    onAddIngredientFromDatabase?: (
      dayId: string,
      mealId: string,
      input: { databaseIngredientId: string; mode: string; amount?: number },
    ) => Promise<void>;
    onCreateIngredient?: (input: unknown) => Promise<unknown>;
    onSearch?: (query: string) => Promise<unknown[]>;
    onUpsertIngredient?: (dayId: string, mealId: string, ingredient: unknown) => Promise<void>;
  } = {},
) {
  return render(
    <FakeStateProvider initialDays={initialDays} {...handlers}>
      <MemoryRouter initialEntries={[route]}>
        <App />
        <LocationProbe />
      </MemoryRouter>
    </FakeStateProvider>,
  );
}

function makeDayWithMeal(ingredients: Ingredient[] = []): DailyMealLog {
  return {
    id: 'd1',
    userId: 'user_test',
    date: todayIso(),
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
    meals: [
      {
        id: 'm1',
        dailyMealLogId: 'd1',
        origin: 'adhoc' as const,
        logged: false,
        name: 'LUNCH',
        createdAt: now,
        updatedAt: now,
        ingredients,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

const dbResultBase = {
  id: 'db1',
  name: 'CHICKEN BREAST',
  servingAmount: 100,
  fat: 3,
  carbs: 0,
  protein: 31,
  fiber: 0,
  calories: 165,
  addedByUserId: 'user_test',
  addedByName: 'Test User',
  creationSource: 'manual',
  saturatedFat: null,
  unsaturatedFat: null,
  monounsaturatedFat: null,
  polyunsaturatedFat: null,
  transFat: null,
  sugar: null,
  micronutrients: null,
  createdAt: new Date('2025-01-15').toISOString(),
  updatedAt: new Date('2025-01-15').toISOString(),
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('nutrition database tab', () => {
  it('shows the database tab with search card on meal edit page', async () => {
    renderApp('/track/day/d1/meal/m1', [makeDayWithMeal()]);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Nutrition Facts Database' })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('tab', { name: 'Nutrition Facts Database' }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g. Chicken breast')).toBeInTheDocument();
    });
  });

  it('shows the total ingredient count in the search label when the tab opens', async () => {
    renderApp('/track/day/d1/meal/m1', [makeDayWithMeal()]);

    await userEvent.click(await screen.findByRole('tab', { name: 'Nutrition Facts Database' }));

    await waitFor(() => {
      expect(
        screen.getByText(`${fakeDbTotal} ingredients available for searching`),
      ).toBeInTheDocument();
    });
  });

  it('does not search when query is less than 2 chars', async () => {
    const onSearch = vi.fn().mockResolvedValue([dbResultBase]);
    renderApp('/track/day/d1/meal/m1', [makeDayWithMeal()], { onSearch });

    await userEvent.click(screen.getByRole('tab', { name: 'Nutrition Facts Database' }));

    const searchInput = await screen.findByPlaceholderText('e.g. Chicken breast');
    await userEvent.type(searchInput, 'c');

    // Wait to ensure no debounce fires
    await new Promise((r) => setTimeout(r, 400));
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('searches when query reaches 2+ chars and shows results', async () => {
    // Two identical results to test duplicate rendering with addedAtLabel
    const onSearch = vi.fn().mockResolvedValue([dbResultBase, { ...dbResultBase, id: 'db2' }]);
    renderApp('/track/day/d1/meal/m1', [makeDayWithMeal()], { onSearch });

    await userEvent.click(screen.getByRole('tab', { name: 'Nutrition Facts Database' }));

    const searchInput = await screen.findByPlaceholderText('e.g. Chicken breast');
    await userEvent.type(searchInput, 'ch');

    // Wait for debounce (300ms) + search
    await waitFor(() => expect(onSearch).toHaveBeenCalledWith('ch'), { timeout: 1000 });

    // Both results should be displayed (duplicate entries)
    await waitFor(() => {
      const names = screen.getAllByText('CHICKEN BREAST');
      expect(names.length).toBeGreaterThanOrEqual(2);
    });

    // Should show addedAtLabel for the results
    const addedLabels = screen.getAllByText(/Added by Test User/);
    expect(addedLabels.length).toBeGreaterThanOrEqual(2);
  });

  it('calls addIngredientFromDatabase with correct args and appends ingredient to the meal', async () => {
    const onAddIngredientFromDatabase = vi.fn().mockResolvedValue(undefined);
    const onSearch = vi.fn().mockResolvedValue([dbResultBase]);

    renderApp('/track/day/d1/meal/m1', [makeDayWithMeal()], {
      onAddIngredientFromDatabase,
      onSearch,
    });

    await userEvent.click(screen.getByRole('tab', { name: 'Nutrition Facts Database' }));

    const searchInput = await screen.findByPlaceholderText('e.g. Chicken breast');
    await userEvent.type(searchInput, 'ch');

    await waitFor(() => expect(onSearch).toHaveBeenCalled(), { timeout: 1000 });

    // Wait for CHICKEN BREAST to appear
    await waitFor(() => {
      expect(screen.getByText('CHICKEN BREAST')).toBeInTheDocument();
    });

    // Enter amount in the NumberInput for the result
    const amountInput = screen.getByLabelText('Weight (g/ml)');
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, '150');

    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(onAddIngredientFromDatabase).toHaveBeenCalledWith('d1', 'm1', {
        databaseIngredientId: 'db1',
        mode: 'weight',
        amount: 150,
      });
    });

    // The stub ingredient should be added to the ingredient list
    await waitFor(() => {
      expect(screen.getByText('DB INGREDIENT')).toBeInTheDocument();
    });
  });

  it('shows inline entry card when "Add an ingredient" is clicked and calls create on publish', async () => {
    const onCreateIngredient = vi.fn().mockResolvedValue({ id: 'new1' });
    renderApp('/track/day/d1/meal/m1', [makeDayWithMeal()], { onCreateIngredient });

    await userEvent.click(screen.getByRole('tab', { name: 'Nutrition Facts Database' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add an ingredient' })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Add an ingredient' }));

    await waitFor(() => {
      expect(screen.getByText('Publish Ingredient')).toBeInTheDocument();
    });

    // Fill in required fields
    const nameInput = screen.getByRole('textbox', { name: 'Name' });
    await userEvent.type(nameInput, 'QUINOA');

    // Fill serving size
    const servingInput = screen.getByLabelText('Serving size');
    await userEvent.clear(servingInput);
    await userEvent.type(servingInput, '100');

    // Fill servings per package (now required)
    const servingsPerPackageInput = screen.getByLabelText('Servings per package');
    await userEvent.clear(servingsPerPackageInput);
    await userEvent.type(servingsPerPackageInput, '4');

    // Fill calories (now required)
    const caloriesInput = screen.getByLabelText('Calories (kcal)');
    await userEvent.clear(caloriesInput);
    await userEvent.type(caloriesInput, '172');
    await userEvent.tab();

    // Fill fat
    const fatInput = screen.getByLabelText('Fat (g)');
    await userEvent.clear(fatInput);
    await userEvent.type(fatInput, '2');

    // Fill carbs
    const carbsInput = screen.getByLabelText('Carbs (g)');
    await userEvent.clear(carbsInput);
    await userEvent.type(carbsInput, '39');

    // Fill protein
    const proteinInput = screen.getByLabelText('Protein (g)');
    await userEvent.clear(proteinInput);
    await userEvent.type(proteinInput, '4');

    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => {
      expect(onCreateIngredient).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'QUINOA',
          servingAmount: 100,
          servingsPerPackage: 4,
          creationSource: 'manual',
        }),
      );
    });

    // Form should be hidden after successful publish
    await waitFor(() => {
      expect(screen.queryByText('Publish Ingredient')).not.toBeInTheDocument();
    });
  });
});

describe('adding a saved label to a meal by mode', () => {
  it('adds an entire package without an amount input (R22)', async () => {
    const onAddIngredientFromDatabase = vi.fn().mockResolvedValue(undefined);
    const onSearch = vi.fn().mockResolvedValue([dbResultBase]);

    renderApp('/track/day/d1/meal/m1', [makeDayWithMeal()], {
      onAddIngredientFromDatabase,
      onSearch,
    });

    await userEvent.click(screen.getByRole('tab', { name: 'Nutrition Facts Database' }));
    const searchInput = await screen.findByPlaceholderText('e.g. Chicken breast');
    await userEvent.type(searchInput, 'ch');
    await waitFor(() => expect(screen.getByText('CHICKEN BREAST')).toBeInTheDocument());

    // Switch the add mode to entire package; the amount input disappears.
    await userEvent.selectOptions(screen.getByLabelText('Add by'), 'package');
    expect(screen.queryByLabelText('Weight (g/ml)')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(onAddIngredientFromDatabase).toHaveBeenCalledWith('d1', 'm1', {
        databaseIngredientId: 'db1',
        mode: 'package',
      });
    });
  });

  it('adds by a number of servings (R22)', async () => {
    const onAddIngredientFromDatabase = vi.fn().mockResolvedValue(undefined);
    const onSearch = vi.fn().mockResolvedValue([dbResultBase]);

    renderApp('/track/day/d1/meal/m1', [makeDayWithMeal()], {
      onAddIngredientFromDatabase,
      onSearch,
    });

    await userEvent.click(screen.getByRole('tab', { name: 'Nutrition Facts Database' }));
    const searchInput = await screen.findByPlaceholderText('e.g. Chicken breast');
    await userEvent.type(searchInput, 'ch');
    await waitFor(() => expect(screen.getByText('CHICKEN BREAST')).toBeInTheDocument());

    await userEvent.selectOptions(screen.getByLabelText('Add by'), 'servings');
    const servingsInput = screen.getByLabelText('# of servings');
    await userEvent.clear(servingsInput);
    await userEvent.type(servingsInput, '2');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(onAddIngredientFromDatabase).toHaveBeenCalledWith('d1', 'm1', {
        databaseIngredientId: 'db1',
        mode: 'servings',
        amount: 2,
      });
    });
  });

  it('adding a photographed entry to a meal carries no image (R12)', async () => {
    const onAddIngredientFromDatabase = vi.fn().mockResolvedValue(undefined);
    // The shared entry has both photos; the meal ingredient must still be
    // numbers-only — the snapshot copies values, never image keys.
    const onSearch = vi.fn().mockResolvedValue([
      {
        ...dbResultBase,
        productPhotoKey: 'nutrition/prod.jpg',
        labelPhotoKey: 'nutrition/label.jpg',
      },
    ]);

    renderApp('/track/day/d1/meal/m1', [makeDayWithMeal()], {
      onAddIngredientFromDatabase,
      onSearch,
    });

    await userEvent.click(screen.getByRole('tab', { name: 'Nutrition Facts Database' }));
    const searchInput = await screen.findByPlaceholderText('e.g. Chicken breast');
    await userEvent.type(searchInput, 'ch');
    await waitFor(() => expect(screen.getByText('CHICKEN BREAST')).toBeInTheDocument());

    // The search result shows a thumbnail (R10) for the photographed entry.
    expect(screen.getByRole('img', { name: /CHICKEN BREAST/i })).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Add by'), 'package');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    // The stub ingredient lands in the meal's ingredient list.
    await waitFor(() => expect(onAddIngredientFromDatabase).toHaveBeenCalled());
    const dbIngredient = await screen.findByText('DB INGREDIENT');
    const mealRow = dbIngredient.closest('li') ?? dbIngredient.parentElement;
    // The added meal ingredient renders numbers only — no photo travels with it.
    expect(mealRow?.querySelector('img')).toBeNull();
  });
});

describe('editing a meal ingredient', () => {
  it('cancel exits edit mode without saving changes', async () => {
    const onUpsertIngredient = vi.fn().mockResolvedValue(undefined);
    const ingredient: Ingredient = makeIngredient({
      id: 'i4',
      mealId: 'm1',
      name: 'OATS',
      weight: 80,
      calories: 300,
      fat: 5,
      saturatedFat: 1,
      carbs: 54,
      fiber: 8,
      protein: 10,
    });

    renderApp('/track/day/d1/meal/m1', [makeDayWithMeal([ingredient])], { onUpsertIngredient });

    await userEvent.click(await screen.findByText('OATS'));

    // Edit mode: form populated, Update + Cancel visible
    expect(screen.getByLabelText('Ingredient Name')).toHaveValue('OATS');
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    // Back to a fresh Add form, nothing persisted
    expect(screen.getByLabelText('Ingredient Name')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    expect(onUpsertIngredient).not.toHaveBeenCalled();
  });
});

describe('tab order and default', () => {
  it('defaults to the nutrition database tab in fastest-first order', async () => {
    renderApp('/track/day/d1/meal/m1', [makeDayWithMeal()]);

    await waitFor(() => {
      expect(screen.getAllByRole('tab').length).toBeGreaterThan(0);
    });

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual([
      'Nutrition Facts Database',
      'Label Scan',
      'Manual Entry',
    ]);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByPlaceholderText('e.g. Chicken breast')).toBeInTheDocument();
  });
});

describe('scan apply in-place', () => {
  it('applying a scan shows the entry card below the scan card without switching tabs', async () => {
    const mockScanResult: ScanResolution = {
      canApply: true,
      proposed: {
        name: 'GRANOLA',
        weight: 120,
        fat: 6,
        saturatedFat: 1,
        carbs: 80,
        fiber: 8,
        protein: 12,
        calories: 446,
      },
      databaseCandidate: null,
      databaseBlockReason: 'Serving size unreadable.',
      notes: [],
      warning: undefined,
    };

    const apiMock = api as unknown as { scanNutrition: ReturnType<typeof vi.fn> };
    apiMock.scanNutrition.mockResolvedValue(mockScanResult);

    renderApp('/track/day/d1/meal/m1', [makeDayWithMeal()]);

    // Navigate to Label Scan tab
    await userEvent.click(await screen.findByRole('tab', { name: 'Label Scan' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Scan Label' })).toBeInTheDocument();
    });

    // Trigger file scan via the hidden FileInput
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    const testFile = new File(['nutritionlabel'], 'label.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    // Wait for ScanReviewModal to appear with Apply button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));

    // Still on the Label Scan tab after applying
    const scanTab = screen.getByRole('tab', { name: 'Label Scan' });
    expect(scanTab).toHaveAttribute('aria-selected', 'true');

    // Scan Label button still visible
    expect(screen.getByRole('button', { name: 'Scan Label' })).toBeInTheDocument();

    // Ingredient entry card now visible with the proposed name and weight
    await waitFor(() => {
      expect(screen.getByLabelText('Weight (g)')).toHaveValue('120');
    });

    // Proposed name flows from the scan resolution into the entry card's Ingredient Name input
    expect(screen.getByLabelText('Ingredient Name')).toHaveValue('GRANOLA');

    // Cancel removes the ingredient entry card while staying on the scan tab
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByLabelText('Weight (g)')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('tab', { name: 'Label Scan' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});

describe('manual ingredient entry defaults', () => {
  it('starts with empty numeric fields and submits blanks as zeros', async () => {
    const onUpsertIngredient = vi.fn().mockResolvedValue(undefined);
    renderApp('/track/day/d1/meal/m1', [makeDayWithMeal()], { onUpsertIngredient });

    // Database tab is now the default; switch to Manual Entry first
    await userEvent.click(await screen.findByRole('tab', { name: 'Manual Entry' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Ingredient Name')).toBeInTheDocument();
    });

    // All numeric fields start empty — no 0 to backspace over
    expect(screen.getByLabelText('Weight (g)')).toHaveValue('');
    expect(screen.getByLabelText('Fat')).toHaveValue('');
    expect(screen.getByLabelText('Carbs')).toHaveValue('');
    expect(screen.getByLabelText('Fiber')).toHaveValue('');
    expect(screen.getByLabelText('Protein')).toHaveValue('');

    await userEvent.type(screen.getByLabelText('Ingredient Name'), 'BANANA');
    await userEvent.type(screen.getByLabelText('Weight (g)'), '118');
    await userEvent.type(screen.getByLabelText('Carbs'), '27');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(onUpsertIngredient).toHaveBeenCalledWith(
        'd1',
        'm1',
        expect.objectContaining({
          name: 'BANANA',
          weight: 118,
          carbs: 27,
          fat: 0,
          saturatedFat: 0,
          fiber: 0,
          protein: 0,
        }),
      );
    });
  });
});

describe('scan-create photo in the embedded database tab (#54 R3/R4)', () => {
  // A readable, save-ready label scan: prefills the create form and is a database
  // candidate, so the create flow opens with the scanned values.
  const readableScan: ScanResolution = {
    canApply: true,
    proposed: {
      name: 'GRANOLA',
      weight: 100,
      fat: 6,
      saturatedFat: 1,
      carbs: 80,
      fiber: 8,
      protein: 12,
      calories: 446,
    },
    databaseCandidate: {
      name: 'GRANOLA',
      servingAmount: 100,
      servingSizeUnit: 'gram',
      servingsPerPackage: 4,
      calories: 446,
      fat: 6,
      carbs: 80,
      protein: 12,
    },
    databaseBlockReason: undefined,
    labelDraft: {
      name: 'GRANOLA',
      servingAmount: 100,
      servingSizeUnit: 'gram',
      servingsPerPackage: 4,
      calories: 446,
      fat: 6,
      carbs: 80,
      protein: 12,
    },
    notes: [],
    warning: undefined,
  };

  it('auto-retains the scanned label frame as the entry label photo (R3)', async () => {
    const apiMock = api as unknown as {
      scanNutrition: ReturnType<typeof vi.fn>;
      nutritionDatabase: { uploadImage: ReturnType<typeof vi.fn> };
    };
    apiMock.scanNutrition.mockResolvedValue(readableScan);

    renderApp('/track/day/d1/meal/m1', [makeDayWithMeal()]);

    await userEvent.click(await screen.findByRole('tab', { name: 'Nutrition Facts Database' }));
    // The search card exposes a Scan Label button when create is allowed.
    await userEvent.click(await screen.findByRole('button', { name: 'Scan to add' }));

    // Capture falls back to the hidden file input in jsdom (no camera).
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();
    const labelFile = new File(['nutritionlabel'], 'label.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [labelFile] } });

    // The scanned frame is uploaded as the label photo (best-effort, in parallel
    // with OCR), then the create form opens prefilled.
    await waitFor(() => expect(apiMock.nutritionDatabase.uploadImage).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('Publish Ingredient')).toBeInTheDocument());

    // The label slot now shows the uploaded photo (mock key -> /images/...).
    await waitFor(() => {
      const labelImg = screen.getByRole('img', { name: 'Nutrition facts label' });
      expect(labelImg).toHaveAttribute('src', '/images/nutrition/test.jpg');
    });
    // The product slot stays empty (the front photo is an optional guided step).
    expect(screen.queryByRole('img', { name: 'Front of product package' })).not.toBeInTheDocument();
  });

  it('does not retain a label photo when the scan is unreadable (R5)', async () => {
    const unreadableScan: ScanResolution = {
      canApply: false,
      blockReason: 'Could not read the label.',
      proposed: {
        name: '',
        weight: 0,
        fat: 0,
        saturatedFat: 0,
        carbs: 0,
        fiber: 0,
        protein: 0,
        calories: 0,
      },
      databaseCandidate: null,
      databaseBlockReason: 'Could not read the label. Retake the photo and try again.',
      labelDraft: null,
      notes: [],
      warning: undefined,
    };
    const apiMock = api as unknown as {
      scanNutrition: ReturnType<typeof vi.fn>;
      nutritionDatabase: { uploadImage: ReturnType<typeof vi.fn> };
    };
    apiMock.scanNutrition.mockResolvedValue(unreadableScan);

    renderApp('/track/day/d1/meal/m1', [makeDayWithMeal()]);

    await userEvent.click(await screen.findByRole('tab', { name: 'Nutrition Facts Database' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Scan to add' }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const labelFile = new File(['blurry'], 'label.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [labelFile] } });

    // The unreadable scan surfaces an error and never opens the create form, so
    // the buffered photo (if any) is dropped — no label slot is shown.
    await waitFor(() => expect(screen.getByText(/Could not read the label/i)).toBeInTheDocument());
    expect(screen.queryByText('Publish Ingredient')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Nutrition facts label' })).not.toBeInTheDocument();
  });
});
