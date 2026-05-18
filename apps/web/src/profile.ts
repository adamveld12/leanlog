export type CalorieMode = 'deficit' | 'maintenance' | 'surplus' | 'custom';
export type MacroMode = 'percentage' | 'custom';

export type Profile = {
  bodyInfo: { weightLbs: number; heightInches: number };
  calorieTarget: { mode: CalorieMode; targetCalories: number | null };
  macroTargets: { mode: MacroMode; fats: number; carbs: number; protein: number };
};

export const PROFILE_KEY = 'profile';

export const defaultProfile: Profile = {
  bodyInfo: { weightLbs: 180, heightInches: 72 },
  calorieTarget: { mode: 'maintenance', targetCalories: 2700 },
  macroTargets: { mode: 'percentage', fats: 25, carbs: 35, protein: 40 },
};

export function parseProfile(raw: string | null): Profile {
  if (!raw) return defaultProfile;
  try {
    const parsed = JSON.parse(raw) as Profile;
    if (!parsed?.bodyInfo || !parsed?.calorieTarget || !parsed?.macroTargets) return defaultProfile;
    return parsed;
  } catch {
    return defaultProfile;
  }
}
