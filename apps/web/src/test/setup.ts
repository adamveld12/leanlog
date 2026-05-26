import '@testing-library/jest-dom/vitest';
import { createElement, Fragment, type PropsWithChildren } from 'react';
import { beforeEach, vi } from 'vitest';

let signedIn = true;

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
}));

vi.mock('../api', () => ({
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
  },
}));

beforeEach(() => {
  signedIn = true;
});
