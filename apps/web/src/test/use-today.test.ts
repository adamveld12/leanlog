import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useToday } from '../hooks/useToday';

describe('useToday (#102)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rolls over to the next date at local midnight without a reload', () => {
    vi.setSystemTime(new Date(2026, 9, 7, 23, 59, 30));
    const { result } = renderHook(() => useToday());
    expect(result.current).toBe('2026-10-07');

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current).toBe('2026-10-08');
  });

  it('catches up when the page regains focus after the device slept past midnight', () => {
    vi.setSystemTime(new Date(2026, 9, 7, 22, 0));
    const { result } = renderHook(() => useToday());

    // Timers don't fire while asleep; only the clock moves.
    vi.setSystemTime(new Date(2026, 9, 8, 7, 0));
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(result.current).toBe('2026-10-08');
  });
});
