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

// Every mutation resolves after the write commits; the store then reloads, so
// side effects (re-derived targets, queued Health Connect writes) are never
// duplicated in UI state. `today` is read lazily so a midnight rollover is seen.
export function createActions(db: Db, getToday: () => string, afterWrite: () => Promise<void>) {
  const write =
    <A extends unknown[], R>(fn: (...args: A) => Promise<R>) =>
    async (...args: A): Promise<R> => {
      const result = await fn(...args);
      await afterWrite();
      return result;
    };
  return {
    logWeight: write((weightLbs: number, date: string = getToday()) =>
      setWeight(db, getToday(), date, {
        weightLbs,
        source: 'manual',
        at: new Date().toISOString(),
      }),
    ),
    setMeasurements: write((patch: MeasurementPatch, date: string = getToday()) =>
      setMeasurements(db, getToday(), date, patch),
    ),
    updateProfile: write((patch: Partial<MobileProfile>) => updateProfile(db, getToday(), patch)),
    saveBodyFat: write((input: BodyFatInput) => saveBodyFatResult(db, getToday(), input)),
    addMeal: write((name: string, date: string = getToday()) =>
      addMeal(db, getToday(), date, name),
    ),
    renameMeal: write((mealId: string, name: string) => renameMeal(db, getToday(), mealId, name)),
    deleteMeal: write((mealId: string) => deleteMeal(db, getToday(), mealId)),
    addIngredient: write((mealId: string, data: NewIngredient) =>
      addIngredient(db, getToday(), mealId, data),
    ),
    addIngredientFromSavedFood: write((mealId: string, foodId: string, grams: number) =>
      addIngredientFromSavedFood(db, getToday(), mealId, foodId, grams),
    ),
    updateIngredient: write((id: string, patch: Partial<NewIngredient>) =>
      updateIngredient(db, getToday(), id, patch),
    ),
    removeIngredient: write((id: string) => removeIngredient(db, getToday(), id)),
    createSavedFood: write((input: NewSavedFood) => createSavedFood(db, input)),
    updateSavedFood: write((id: string, patch: Partial<NewSavedFood>) =>
      updateSavedFood(db, id, patch),
    ),
    deleteSavedFood: write((id: string) => deleteSavedFood(db, id)),
    updateSettings: write((patch: Partial<MobileSettings>) => updateSettings(db, patch)),
  };
}

export type Actions = ReturnType<typeof createActions>;
export type { MobileDay };
