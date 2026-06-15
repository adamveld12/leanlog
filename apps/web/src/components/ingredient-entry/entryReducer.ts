import { emptyDraft, type EntryIngredient, type IngredientDraft } from './types';

export type EntryTab = 'manual' | 'scan' | 'database';
export type DraftSource = 'manual' | 'scanned';

export type EntryState = {
  tab: EntryTab;
  draft: IngredientDraft;
  draftSource: DraftSource;
  editingId: string | null;
};

export type EntryAction =
  | { type: 'setTab'; tab: EntryTab }
  | { type: 'patchDraft'; draft: IngredientDraft }
  | { type: 'editRow'; ingredient: EntryIngredient }
  | { type: 'applyScan'; patch: Partial<IngredientDraft> }
  | { type: 'reset' };

export const initialEntryState: EntryState = {
  tab: 'database',
  draft: emptyDraft,
  draftSource: 'manual',
  editingId: null,
};

function draftFromIngredient(i: EntryIngredient): IngredientDraft {
  return {
    name: i.name,
    weight: i.weight,
    calories: i.calorieSource === 'explicit' ? i.calories : null,
    fat: i.fat,
    saturatedFat: i.saturatedFat,
    carbs: i.carbs,
    fiber: i.fiber,
    protein: i.protein,
    sugarAlcohol: i.sugarAlcohol ?? null,
    allulose: i.allulose ?? null,
    alcohol: i.alcohol ?? null,
    // Preserve snapshot extras so editing doesn't wipe them on upsert.
    unsaturatedFat: i.unsaturatedFat ?? null,
    monounsaturatedFat: i.monounsaturatedFat ?? null,
    polyunsaturatedFat: i.polyunsaturatedFat ?? null,
    transFat: i.transFat ?? null,
    sugar: i.sugar ?? null,
    micronutrients: i.micronutrients ?? null,
    sourceDatabaseIngredientId: i.sourceDatabaseIngredientId ?? null,
  };
}

export function entryReducer(state: EntryState, action: EntryAction): EntryState {
  switch (action.type) {
    case 'setTab':
      return { ...state, tab: action.tab };
    case 'patchDraft':
      return { ...state, draft: action.draft };
    case 'editRow':
      return {
        tab: 'manual',
        draft: draftFromIngredient(action.ingredient),
        draftSource: 'manual',
        editingId: action.ingredient.id,
      };
    case 'applyScan':
      return {
        ...state,
        draft: { ...state.draft, ...action.patch },
        draftSource: 'scanned',
      };
    case 'reset':
      return { ...state, draft: emptyDraft, draftSource: 'manual', editingId: null };
    default:
      return state;
  }
}
