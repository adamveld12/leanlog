import '@testing-library/jest-dom/vitest';
import { createElement, Fragment, type PropsWithChildren } from 'react';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import type { api as RealApi } from '../api';

// Unmount the React tree after every test so renders don't leak across cases.
afterEach(() => {
  cleanup();
});

let signedIn = true;

// Stable identity across renders. The store's load effect depends on getToken;
// a fresh function each call would re-run it every render and hang renderHook.
const getToken = () => Promise.resolve('test-token');

vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
  },
}));

vi.mock('@clerk/clerk-react', () => ({
  __setSignedIn: (value: boolean) => {
    signedIn = value;
  },
  ClerkProvider: ({ children }: PropsWithChildren) => createElement(Fragment, null, children),
  SignInButton: ({ children }: PropsWithChildren) => createElement(Fragment, null, children),
  SignedIn: ({ children }: PropsWithChildren) =>
    signedIn ? createElement(Fragment, null, children) : null,
  SignedOut: ({ children }: PropsWithChildren) =>
    signedIn ? null : createElement(Fragment, null, children),
  UserButton: () => createElement('button', { type: 'button' }, 'User'),
  PricingTable: () => createElement('div', null, 'Pricing Table'),
  useAuth: () => ({
    isSignedIn: signedIn,
    getToken,
  }),
  useUser: () => ({
    isSignedIn: signedIn,
    user: signedIn
      ? {
          id: 'user_test',
          primaryEmailAddress: { emailAddress: 'test@example.com' },
          fullName: 'Test User',
        }
      : null,
  }),
}));

class MockApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(`API ${status}: ${message}`);
    this.name = 'ApiError';
    this.status = status;
  }
}

// `satisfies typeof RealApi` makes TypeScript fail this mock the moment a new
// method is added to the real api but not mirrored here — instead of unrelated
// tests blowing up at runtime with a confusing "undefined is not a function".
vi.mock('../api', () => ({
  ApiError: MockApiError,
  api: {
    days: {
      list: vi.fn(() => Promise.resolve({ days: [] })),
      create: vi.fn(),
      get: vi.fn(),
      updateTargets: vi.fn(),
      delete: vi.fn(),
    },
    meals: {
      create: vi.fn(),
      rename: vi.fn(),
      setLogged: vi.fn(),
      delete: vi.fn(),
    },
    mealTemplates: {
      list: vi.fn(() => Promise.resolve({ templates: [] })),
      create: vi.fn(),
      rename: vi.fn(),
      delete: vi.fn(),
      reorder: vi.fn(() => Promise.resolve({ templates: [] })),
      upsertIngredient: vi.fn(),
      deleteIngredient: vi.fn(),
      addIngredientFromDatabase: vi.fn(),
    },
    ingredients: {
      upsert: vi.fn(),
      delete: vi.fn(),
      addFromDatabase: vi.fn(),
    },
    nutritionDatabase: {
      search: vi.fn(() => Promise.resolve({ results: [], total: 0 })),
      list: vi.fn(() => Promise.resolve({ results: [], total: 0 })),
      create: vi.fn(),
      update: vi.fn(),
      uploadImage: vi.fn(() =>
        Promise.resolve({ key: 'nutrition/test.jpg', contentType: 'image/jpeg' }),
      ),
      updatePhotos: vi.fn(),
      delete: vi.fn(),
    },
    profile: {
      get: () =>
        Promise.resolve({
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
          frontBaselineDate: null,
          sideBaselineDate: null,
          backBaselineDate: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      update: vi.fn(),
    },
    goals: {
      // Default: just the background maintenance goal, so day creation always
      // resolves a covering goal.
      list: vi.fn(() =>
        Promise.resolve({
          goals: [
            {
              id: 'bg',
              userId: 'user_test',
              isBackground: true,
              name: 'Maintenance',
              description: null,
              mode: 'maintain' as const,
              targetWeightLbs: null,
              macroFats: 25,
              macroCarbs: 35,
              macroProtein: 40,
              startDate: null,
              endDate: null,
              calorieDelta: 0,
              calorieBasis: 'bodyweight' as const,
              bodyFatPct: null,
              activityLevel: null,
              mealSlots: [
                { name: 'Breakfast', ingredients: [] },
                { name: 'Lunch', ingredients: [] },
                { name: 'Dinner', ingredients: [] },
                { name: 'Snack', ingredients: [] },
              ],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        }),
      ),
      create: vi.fn(),
      update: vi.fn(),
      updateBackground: vi.fn(),
      delete: vi.fn(),
    },
    scanNutrition: vi.fn(),
  } satisfies typeof RealApi,
}));

beforeEach(() => {
  signedIn = true;
});
