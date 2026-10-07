import type { MobileDay, MobileProfile } from '@leanlog/data-access';
import { saveBodyFatResult, type BodyFatInput } from '../db/repos/body';
import { setMeasurements, setWeight, type MeasurementPatch } from '../db/repos/days';
import {
  addIngredient,
  addIngredientFromSavedFood,
  addMeal,
  deleteMeal,
  removeIngredient,
  renameMeal,
  updateIngredient,
  type NewIngredient,
} from '../db/repos/meals';
import { updateProfile } from '../db/repos/profile';
import type { NewSavedFood } from '../db/repos/savedFoods';
import { createSavedFood, deleteSavedFood, updateSavedFood } from '../db/repos/savedFoods';
import { updateSettings, type MobileSettings } from '../db/repos/base';
import type { Db } from '../db/types';
import { track } from '../telemetry/analytics';

// Every mutation resolves after the write commits; the store then reloads, so
// side effects (re-derived targets, queued Health Connect writes) are never
// duplicated in UI state. `today` is read lazily so a midnight rollover is seen.
export function createActions(db: Db, getToday: () => string, afterWrite: () => Promise<void>) {
  // `report` sends a (count-only, anonymous) analytics event once the write has committed.
  const write =
    <A extends unknown[], R>(fn: (...args: A) => Promise<R>, report?: (...args: A) => void) =>
    async (...args: A): Promise<R> => {
      const result = await fn(...args);
      report?.(...args);
      await afterWrite();
      return result;
    };
  return {
    logWeight: write(
      (weightLbs: number, date: string = getToday()) =>
        setWeight(db, getToday(), date, {
          weightLbs,
          source: 'manual',
          at: new Date().toISOString(),
        }),
      () => track('weight_logged', { source: 'manual' }),
    ),
    setMeasurements: write(
      (patch: MeasurementPatch, date: string = getToday()) =>
        setMeasurements(db, getToday(), date, patch),
      (patch) =>
        track('measurement_logged', {
          sites: Object.values(patch).filter((v) => v != null).length,
        }),
    ),
    updateProfile: write(
      (patch: Partial<MobileProfile>) => updateProfile(db, getToday(), patch),
      (patch) => {
        if ('activityLevel' in patch) track('profile_targets_changed', { field: 'activity' });
        if ('calorieDelta' in patch) track('profile_targets_changed', { field: 'delta' });
        if ('macroFats' in patch || 'macroCarbs' in patch || 'macroProtein' in patch) {
          track('profile_targets_changed', { field: 'split' });
        }
      },
    ),
    saveBodyFat: write(
      (input: BodyFatInput) => saveBodyFatResult(db, getToday(), input),
      (input) => track('body_fat_calculated', { method: input.method, saved: true }),
    ),
    addMeal: write(
      (name: string, date: string = getToday()) => addMeal(db, getToday(), date, name),
      () => track('meal_created'),
    ),
    renameMeal: write((mealId: string, name: string) => renameMeal(db, getToday(), mealId, name)),
    deleteMeal: write((mealId: string) => deleteMeal(db, getToday(), mealId)),
    addIngredient: write(
      (mealId: string, data: NewIngredient) => addIngredient(db, getToday(), mealId, data),
      () => track('ingredient_added', { source: 'manual' }),
    ),
    addIngredientFromSavedFood: write(
      (mealId: string, foodId: string, grams: number) =>
        addIngredientFromSavedFood(db, getToday(), mealId, foodId, grams),
      () => track('ingredient_added', { source: 'saved_food' }),
    ),
    updateIngredient: write((id: string, patch: Partial<NewIngredient>) =>
      updateIngredient(db, getToday(), id, patch),
    ),
    removeIngredient: write((id: string) => removeIngredient(db, getToday(), id)),
    // `from` records where the food was saved: the list, or a one-tap save from an entry (R6).
    createSavedFood: write(
      (input: NewSavedFood, _from: 'list' | 'entry' = 'list') => createSavedFood(db, input),
      (_input, from = 'list') => track('saved_food_created', { from }),
    ),
    updateSavedFood: write((id: string, patch: Partial<NewSavedFood>) =>
      updateSavedFood(db, id, patch),
    ),
    deleteSavedFood: write((id: string) => deleteSavedFood(db, id)),
    updateSettings: write(
      (patch: Partial<MobileSettings>) => updateSettings(db, patch),
      (patch) => {
        if (patch.units) track('units_changed', { to: patch.units });
      },
    ),
  };
}

export type Actions = ReturnType<typeof createActions>;
export type { MobileDay };
