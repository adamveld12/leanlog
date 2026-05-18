export type CalorieMode = 'deficit' | 'maintenance' | 'surplus' | 'custom';
export type MacroMode = 'percentage' | 'custom';

export type Profile = {
  bodyInfo: { weightLbs: number; heightInches: number };
  calorieTarget: { mode: CalorieMode; targetCalories: number | null };
  macroTargets: { mode: MacroMode; fats: number; carbs: number; protein: number };
};

export const PROFILE_KEY = 'profile';

export const defaultProfile: Profile = {
  bodyInfo: { weightLbs: 0, heightInches: 0 },
  calorieTarget: { mode: 'maintenance', targetCalories: null },
  macroTargets: { mode: 'percentage', fats: 30, carbs: 40, protein: 30 },
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
