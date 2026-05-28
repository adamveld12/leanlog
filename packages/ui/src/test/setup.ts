import '@testing-library/jest-dom/vitest';
import { createElement } from 'react';
import { vi } from 'vitest';

// chart.js touches getComputedStyle on the canvas's parent via a ResizeObserver tick
// that fires after jsdom has already detached the node. Stub the React wrapper so
// tests that mount components containing charts don't crash.
vi.mock('react-chartjs-2', () => ({
  Line: () => createElement('div', { 'data-testid': 'chart-mock' }),
  Bar: () => createElement('div', { 'data-testid': 'chart-mock' }),
  Pie: () => createElement('div', { 'data-testid': 'chart-mock' }),
  Doughnut: () => createElement('div', { 'data-testid': 'chart-mock' }),
}));
