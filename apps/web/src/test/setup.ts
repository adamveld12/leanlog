import '@testing-library/jest-dom/vitest';
import { createElement, Fragment, type PropsWithChildren } from 'react';
import { beforeEach, vi } from 'vitest';

let signedIn = true;

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
    getToken: () => Promise.resolve('test-token'),
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
      delete: vi.fn(),
    },
    ingredients: {
      upsert: vi.fn(),
      delete: vi.fn(),
      addFromDatabase: vi.fn(),
    },
    nutritionDatabase: {
      search: vi.fn(() => Promise.resolve({ results: [] })),
      create: vi.fn(),
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      update: vi.fn(),
    },
    scanNutrition: vi.fn(),
  },
}));

beforeEach(() => {
  signedIn = true;
});
