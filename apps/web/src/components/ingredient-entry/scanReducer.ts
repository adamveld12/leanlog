import type { LabelScanValue } from '@leanlog/ui';
import type { ScanResolution } from '@leanlog/data-access';

export type ScanState = {
  form: LabelScanValue;
  loading: boolean;
  error: string;
  cameraError: string;
  cameraOpen: boolean;
  result: ScanResolution | null;
};

export type ScanAction =
  | { type: 'setForm'; form: LabelScanValue }
  | { type: 'scanStart' }
  | { type: 'scanSucceeded'; result: ScanResolution }
  | { type: 'scanFailed'; error: string }
  | { type: 'cameraOpening' }
  | { type: 'cameraOpened' }
  | { type: 'cameraFailed'; error: string }
  | { type: 'cameraClosed' }
  | { type: 'clearResult' }
  | { type: 'resetForm' };

export const initialScanState: ScanState = {
  form: { mode: 'weight', amount: null },
  loading: false,
  error: '',
  cameraError: '',
  cameraOpen: false,
  result: null,
};

export function scanReducer(state: ScanState, action: ScanAction): ScanState {
  switch (action.type) {
    case 'setForm':
      return { ...state, form: action.form };
    case 'scanStart':
      return { ...state, loading: true, error: '', cameraError: '' };
    case 'scanSucceeded':
      return { ...state, loading: false, result: action.result };
    case 'scanFailed':
      return { ...state, loading: false, error: action.error };
    case 'cameraOpening':
      return { ...state, cameraError: '' };
    case 'cameraOpened':
      return { ...state, cameraOpen: true, cameraError: '' };
    case 'cameraFailed':
      return { ...state, cameraError: action.error };
    case 'cameraClosed':
      return { ...state, cameraOpen: false };
    case 'clearResult':
      return { ...state, result: null };
    case 'resetForm':
      return { ...state, form: { mode: 'weight', amount: null } };
    default:
      return state;
  }
}
