import type { NutritionDatabaseEntryValue } from '@leanlog/ui';
import type { NutritionDatabaseIngredientSearchResult } from '../../types';
import { emptyDbEntryValue } from '../ingredient-entry/dbReducer';

// How many labels a single browse page fetches (#49). Matches the repository cap.
export const NUTRITION_FACTS_PAGE_SIZE = 50;

// Map a saved label into the editable form shape. Used when the user edits an
// existing label: every stored field is carried into the form for review.
export function labelToEntryValue(
  label: NutritionDatabaseIngredientSearchResult,
): NutritionDatabaseEntryValue {
  return {
    name: label.name,
    servingAmount: label.servingAmount,
    servingSizeUnit: label.servingSizeUnit,
    servingSizeDisplayText: label.servingSizeDisplayText ?? null,
    servingsPerPackage: label.servingsPerPackage,
    calories: label.calories,
    fat: label.fat,
    carbs: label.carbs,
    protein: label.protein,
    saturatedFat: label.saturatedFat ?? null,
    unsaturatedFat: label.unsaturatedFat ?? null,
    monounsaturatedFat: label.monounsaturatedFat ?? null,
    polyunsaturatedFat: label.polyunsaturatedFat ?? null,
    transFat: label.transFat ?? null,
    fiber: label.fiber ?? null,
    sugar: label.sugar ?? null,
    addedSugars: label.addedSugars ?? null,
    sugarAlcohol: label.sugarAlcohol ?? null,
    allulose: label.allulose ?? null,
    alcohol: label.alcohol ?? null,
    micronutrients: label.micronutrients?.map((m) => ({
      name: m.name,
      amount: m.amount,
      unit: m.unit,
    })),
    productPhotoKey: label.productPhotoKey ?? null,
    labelPhotoKey: label.labelPhotoKey ?? null,
  };
}

export type NutritionFactsState = {
  query: string;
  // Full saved-label records currently shown (browse page(s) or search results).
  records: NutritionDatabaseIngredientSearchResult[];
  loading: boolean;
  searched: boolean;
  error: string;
  total: number | null;
  offset: number;
  hasMore: boolean;
  // Inline create/edit form.
  formOpen: boolean;
  editingId: string | null;
  entryValue: NutritionDatabaseEntryValue;
  entrySource: 'manual' | 'scan';
  submitting: boolean;
  deletingId: string | null;
};

export type NutritionFactsAction =
  | { type: 'setQuery'; query: string }
  | { type: 'browseStart' }
  | {
      type: 'browseSucceeded';
      records: NutritionDatabaseIngredientSearchResult[];
      total: number;
      append: boolean;
    }
  | { type: 'browseFailed' }
  | { type: 'searchStart' }
  | {
      type: 'searchSucceeded';
      records: NutritionDatabaseIngredientSearchResult[];
      total: number;
    }
  | { type: 'searchFailed' }
  | { type: 'openCreate' }
  | { type: 'openEdit'; id: string; value: NutritionDatabaseEntryValue }
  | { type: 'closeForm' }
  | { type: 'stageScan'; value: NutritionDatabaseEntryValue }
  | { type: 'scanUnreadable'; error: string }
  // Sets a photo key on the in-progress create form (e.g. the scanned label
  // frame uploaded as the label photo, #54). Ignored once the form is closed.
  | { type: 'stageScanPhoto'; slot: 'product' | 'label'; key: string }
  | { type: 'setEntryValue'; value: NutritionDatabaseEntryValue }
  | { type: 'submitStart' }
  | { type: 'createSucceeded'; record: NutritionDatabaseIngredientSearchResult }
  | { type: 'updateSucceeded'; record: NutritionDatabaseIngredientSearchResult }
  | { type: 'submitFailed' }
  | { type: 'photosUpdated'; record: NutritionDatabaseIngredientSearchResult }
  | { type: 'deleteStart'; id: string }
  | { type: 'deleteSucceeded'; id: string }
  | { type: 'deleteFailed' };

export const initialNutritionFactsState: NutritionFactsState = {
  query: '',
  records: [],
  loading: false,
  searched: false,
  error: '',
  total: null,
  offset: 0,
  hasMore: false,
  formOpen: false,
  editingId: null,
  entryValue: emptyDbEntryValue,
  entrySource: 'manual',
  submitting: false,
  deletingId: null,
};

export function nutritionFactsReducer(
  state: NutritionFactsState,
  action: NutritionFactsAction,
): NutritionFactsState {
  switch (action.type) {
    case 'setQuery':
      return { ...state, query: action.query };
    case 'browseStart':
    case 'searchStart':
      return { ...state, loading: true, error: '' };
    case 'browseSucceeded': {
      const records = action.append ? [...state.records, ...action.records] : action.records;
      return {
        ...state,
        loading: false,
        searched: true,
        records,
        total: action.total,
        offset: records.length,
        hasMore: action.records.length === NUTRITION_FACTS_PAGE_SIZE,
      };
    }
    case 'browseFailed':
      return { ...state, loading: false, searched: true, error: 'Could not load labels.' };
    case 'searchSucceeded':
      return {
        ...state,
        loading: false,
        searched: true,
        records: action.records,
        total: action.total,
        // Search results are not paginated for browse-style "load more".
        hasMore: false,
      };
    case 'searchFailed':
      return {
        ...state,
        loading: false,
        searched: true,
        error: 'Search failed. Please try again.',
      };
    case 'openCreate':
      return {
        ...state,
        formOpen: true,
        editingId: null,
        entryValue: emptyDbEntryValue,
        entrySource: 'manual',
        error: '',
      };
    case 'openEdit':
      return {
        ...state,
        formOpen: true,
        editingId: action.id,
        entryValue: action.value,
        entrySource: 'manual',
        error: '',
      };
    case 'closeForm':
      return { ...state, formOpen: false, editingId: null, entryValue: emptyDbEntryValue };
    // A scan always opens the create form (editing happens through openEdit), even
    // when not save-ready, so the user can fill gaps; the form flags what's missing.
    case 'stageScan':
      return {
        ...state,
        formOpen: true,
        editingId: null,
        entrySource: 'scan',
        entryValue: action.value,
        error: '',
      };
    case 'scanUnreadable':
      return { ...state, formOpen: false, error: action.error };
    // Only stage the scanned photo while the create form is open and unsaved;
    // if the scan was unreadable (form closed) the upload is discarded.
    case 'stageScanPhoto':
      if (!state.formOpen || state.editingId) return state;
      return {
        ...state,
        entryValue: {
          ...state.entryValue,
          [action.slot === 'product' ? 'productPhotoKey' : 'labelPhotoKey']: action.key,
        },
      };
    case 'setEntryValue':
      return { ...state, entryValue: action.value };
    case 'submitStart':
      return { ...state, submitting: true };
    case 'createSucceeded':
      return {
        ...state,
        submitting: false,
        formOpen: false,
        editingId: null,
        entryValue: emptyDbEntryValue,
        records: [action.record, ...state.records],
        total: state.total == null ? state.total : state.total + 1,
      };
    case 'updateSucceeded':
      return {
        ...state,
        submitting: false,
        formOpen: false,
        editingId: null,
        entryValue: emptyDbEntryValue,
        records: state.records.map((r) => (r.id === action.record.id ? action.record : r)),
      };
    case 'submitFailed':
      return { ...state, submitting: false, error: 'Could not save the label. Please try again.' };
    // A photo slot was set/cleared on an existing entry (#54). Mirror the new
    // keys into both the record list and, when that entry is open for editing,
    // the form value so the slots reflect the change immediately.
    case 'photosUpdated':
      return {
        ...state,
        records: state.records.map((r) => (r.id === action.record.id ? action.record : r)),
        entryValue:
          state.editingId === action.record.id
            ? {
                ...state.entryValue,
                productPhotoKey: action.record.productPhotoKey ?? null,
                labelPhotoKey: action.record.labelPhotoKey ?? null,
              }
            : state.entryValue,
      };
    case 'deleteStart':
      return { ...state, deletingId: action.id, error: '' };
    case 'deleteSucceeded':
      return {
        ...state,
        deletingId: null,
        records: state.records.filter((r) => r.id !== action.id),
        total: state.total == null ? state.total : Math.max(0, state.total - 1),
      };
    case 'deleteFailed':
      return { ...state, deletingId: null, error: 'Could not delete the label. Please try again.' };
    default:
      return state;
  }
}
