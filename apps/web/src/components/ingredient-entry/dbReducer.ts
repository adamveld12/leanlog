import type { NutritionDatabaseEntryValue, NutritionDatabaseSearchResult } from '@leanlog/ui';

export const emptyDbEntryValue: NutritionDatabaseEntryValue = {
  name: '',
  servingAmount: null,
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
  addingId: string | null;
  showCreate: boolean;
  entryValue: NutritionDatabaseEntryValue;
  creating: boolean;
  error: string;
};

export type DbAction =
  | { type: 'setQuery'; query: string }
  | { type: 'clearResults' }
  | { type: 'searchStart' }
  | { type: 'searchSucceeded'; results: NutritionDatabaseSearchResult[] }
  | { type: 'searchFailed' }
  | { type: 'setAmount'; id: string; amount: number }
  | { type: 'addStart'; id: string }
  | { type: 'addSucceeded'; id: string }
  | { type: 'addFailed' }
  | { type: 'toggleCreate' }
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
  addingId: null,
  showCreate: false,
  entryValue: emptyDbEntryValue,
  creating: false,
  error: '',
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
      return { ...state, showCreate: !state.showCreate };
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
