import type {
  AddFromDatabaseMode,
  NutritionDatabaseEntryValue,
  NutritionDatabaseSearchResult,
} from '@leanlog/ui';

export const emptyDbEntryValue: NutritionDatabaseEntryValue = {
  name: '',
  servingAmount: null,
  servingSizeUnit: 'gram',
  servingSizeDisplayText: null,
  servingsPerPackage: null,
  calories: null,
  fat: null,
  carbs: null,
  protein: null,
};

export type DbState = {
  query: string;
  results: NutritionDatabaseSearchResult[];
  loading: boolean;
  searched: boolean;
  amounts: Record<string, number>;
  /** Per-result add mode (weight / servings / package); defaults to weight. */
  modes: Record<string, AddFromDatabaseMode>;
  addingId: string | null;
  showCreate: boolean;
  entryValue: NutritionDatabaseEntryValue;
  creating: boolean;
  error: string;
  // A scanned photo key that arrived before stageScan opened the create form.
  // The R2 upload usually resolves before the slower OCR, so we buffer it here
  // and merge it when the form opens (R3); cleared on close/unreadable (R5).
  pendingScanPhoto: { slot: 'product' | 'label'; key: string } | null;
};

export type DbAction =
  | { type: 'setQuery'; query: string }
  | { type: 'clearResults' }
  | { type: 'searchStart' }
  | { type: 'searchSucceeded'; results: NutritionDatabaseSearchResult[] }
  | { type: 'searchFailed' }
  | { type: 'setAmount'; id: string; amount: number }
  | { type: 'setMode'; id: string; mode: AddFromDatabaseMode }
  | { type: 'addStart'; id: string }
  | { type: 'addSucceeded'; id: string }
  | { type: 'addFailed' }
  | { type: 'toggleCreate' }
  | { type: 'closeCreate' }
  | { type: 'stageScan'; value: NutritionDatabaseEntryValue }
  | { type: 'stageScanPhoto'; slot: 'product' | 'label'; key: string }
  | { type: 'scanUnreadable'; error: string }
  | { type: 'setEntryValue'; value: NutritionDatabaseEntryValue }
  | { type: 'createStart' }
  | { type: 'createSucceeded' }
  | { type: 'createFailed' };

export const initialDbState: DbState = {
  query: '',
  results: [],
  loading: false,
  searched: false,
  amounts: {},
  modes: {},
  addingId: null,
  showCreate: false,
  entryValue: emptyDbEntryValue,
  creating: false,
  error: '',
  pendingScanPhoto: null,
};

export function dbReducer(state: DbState, action: DbAction): DbState {
  switch (action.type) {
    case 'setQuery':
      return { ...state, query: action.query };
    case 'clearResults':
      return { ...state, results: [], searched: false };
    case 'searchStart':
      return { ...state, loading: true };
    case 'searchSucceeded':
      return { ...state, loading: false, searched: true, results: action.results };
    case 'searchFailed':
      return {
        ...state,
        loading: false,
        searched: true,
        error: 'Search failed. Please try again.',
      };
    case 'setAmount':
      return { ...state, amounts: { ...state.amounts, [action.id]: action.amount } };
    case 'setMode':
      return { ...state, modes: { ...state.modes, [action.id]: action.mode } };
    case 'addStart':
      return { ...state, addingId: action.id };
    case 'addSucceeded': {
      const amounts = { ...state.amounts };
      delete amounts[action.id];
      return { ...state, addingId: null, amounts };
    }
    case 'addFailed':
      return { ...state, addingId: null, error: 'Failed to add ingredient. Please try again.' };
    case 'toggleCreate':
      // Opening fresh clears any buffered scan photo from a prior aborted scan.
      return { ...state, showCreate: !state.showCreate, pendingScanPhoto: null };
    case 'closeCreate':
      return { ...state, showCreate: false, pendingScanPhoto: null };
    // A scan prefills the create form (even when not save-ready, so the user can
    // fill gaps); the form's required-field highlighting flags what's missing.
    case 'stageScan': {
      // Merge any photo that arrived before the form opened (R3 race), then clear
      // the buffer.
      const pending = state.pendingScanPhoto;
      const entryValue = pending
        ? {
            ...action.value,
            [pending.slot === 'product' ? 'productPhotoKey' : 'labelPhotoKey']: pending.key,
          }
        : action.value;
      return { ...state, entryValue, showCreate: true, pendingScanPhoto: null, error: '' };
    }
    // Stage the scanned label frame as the entry's label photo (R3). If it
    // arrives before stageScan opens the form (R2 upload beats OCR), buffer it so
    // stageScan can merge it; a discarded/unreadable scan keeps nothing (R5).
    case 'stageScanPhoto':
      if (!state.showCreate) {
        return { ...state, pendingScanPhoto: { slot: action.slot, key: action.key } };
      }
      return {
        ...state,
        entryValue: {
          ...state.entryValue,
          [action.slot === 'product' ? 'productPhotoKey' : 'labelPhotoKey']: action.key,
        },
      };
    case 'scanUnreadable':
      // The scan failed: drop the form and any buffered/staged photo (R5).
      return { ...state, showCreate: false, pendingScanPhoto: null, error: action.error };
    case 'setEntryValue':
      return { ...state, entryValue: action.value };
    case 'createStart':
      return { ...state, creating: true };
    case 'createSucceeded':
      return { ...state, creating: false, showCreate: false, entryValue: emptyDbEntryValue };
    case 'createFailed':
      return {
        ...state,
        creating: false,
        error: 'Failed to publish ingredient. Please try again.',
      };
    default:
      return state;
  }
}
