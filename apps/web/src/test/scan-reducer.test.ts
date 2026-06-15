import { describe, expect, it } from 'vitest';
import {
  initialScanState,
  scanReducer,
  type ScanState,
} from '../components/ingredient-entry/scanReducer';
import type { ScanResolution } from '@leanlog/data-access';

const result = { canApply: true } as unknown as ScanResolution;

describe('scanReducer', () => {
  it('scanStart sets loading and clears both error channels', () => {
    const dirty: ScanState = { ...initialScanState, error: 'old', cameraError: 'cam' };
    const next = scanReducer(dirty, { type: 'scanStart' });
    expect(next.loading).toBe(true);
    expect(next.error).toBe('');
    expect(next.cameraError).toBe('');
  });

  it('scanSucceeded stops loading and stores the result', () => {
    const next = scanReducer(
      { ...initialScanState, loading: true },
      {
        type: 'scanSucceeded',
        result,
      },
    );
    expect(next.loading).toBe(false);
    expect(next.result).toBe(result);
  });

  it('scanFailed stops loading and records the message', () => {
    const next = scanReducer(
      { ...initialScanState, loading: true },
      {
        type: 'scanFailed',
        error: 'boom',
      },
    );
    expect(next.loading).toBe(false);
    expect(next.error).toBe('boom');
  });

  it('camera lifecycle toggles open state', () => {
    const opened = scanReducer(initialScanState, { type: 'cameraOpened' });
    expect(opened.cameraOpen).toBe(true);
    expect(scanReducer(opened, { type: 'cameraClosed' }).cameraOpen).toBe(false);
  });

  it('resetForm restores the default weight form', () => {
    const dirty: ScanState = { ...initialScanState, form: { mode: 'servings', amount: 3 } };
    expect(scanReducer(dirty, { type: 'resetForm' }).form).toEqual({
      mode: 'weight',
      amount: null,
    });
  });
});
