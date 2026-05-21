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
}));

beforeEach(() => {
  signedIn = true;
});
