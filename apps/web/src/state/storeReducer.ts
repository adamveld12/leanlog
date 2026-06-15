import type { DailyMealLog, Meal, MealTemplate, UserProfile } from '@leanlog/data-access';

type MealIngredient = Meal['ingredients'][number];
type TemplateIngredient = MealTemplate['ingredients'][number];

export type StoreState = {
  days: DailyMealLog[];
  templates: MealTemplate[];
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
};

export const initialStoreState: StoreState = {
  days: [],
  templates: [],
  profile: null,
  loading: true,
  error: null,
};

export type StoreAction =
  | { type: 'loaded'; days: DailyMealLog[]; profile: UserProfile; templates: MealTemplate[] }
  | { type: 'loadFailed'; error: string }
  | { type: 'loadingDone' }
  | { type: 'dayUpserted'; day: DailyMealLog }
  | { type: 'dayAdded'; day: DailyMealLog }
  | { type: 'dayRemoved'; dayId: string }
  | { type: 'dayReplaced'; day: DailyMealLog }
  | { type: 'mealAdded'; dayId: string; meal: Meal }
  | { type: 'mealRemoved'; dayId: string; mealId: string }
  | { type: 'mealPatched'; dayId: string; mealId: string; patch: Partial<Meal> }
  | { type: 'ingredientUpserted'; dayId: string; mealId: string; ingredient: MealIngredient }
  | { type: 'ingredientRemoved'; dayId: string; mealId: string; ingredientId: string }
  | { type: 'templatesSet'; templates: MealTemplate[] }
  | { type: 'templateAdded'; template: MealTemplate }
  | { type: 'templateReplaced'; template: MealTemplate }
  | { type: 'templateRemoved'; templateId: string }
  | { type: 'templatesReordered'; orderedIds: string[] }
  | { type: 'templateIngredientUpserted'; templateId: string; ingredient: TemplateIngredient }
  | { type: 'templateIngredientRemoved'; templateId: string; ingredientId: string }
  | { type: 'profileSet'; profile: UserProfile | null }
  | { type: 'profilePatched'; data: Partial<UserProfile> };

function mapDay(
  days: DailyMealLog[],
  dayId: string,
  fn: (day: DailyMealLog) => DailyMealLog,
): DailyMealLog[] {
  return days.map((d) => (d.id === dayId ? fn(d) : d));
}

function mapMeal(day: DailyMealLog, mealId: string, fn: (meal: Meal) => Meal): DailyMealLog {
  return { ...day, meals: day.meals.map((m) => (m.id === mealId ? fn(m) : m)) };
}

export function storeReducer(state: StoreState, action: StoreAction): StoreState {
  switch (action.type) {
    case 'loaded': {
      const loadedIds = new Set(action.days.map((day) => day.id));
      return {
        ...state,
        days: [...action.days, ...state.days.filter((day) => !loadedIds.has(day.id))],
        profile: action.profile,
        templates: action.templates,
      };
    }
    case 'loadFailed':
      return { ...state, error: action.error };
    case 'loadingDone':
      return { ...state, loading: false };

    case 'dayUpserted': {
      const found = state.days.some((d) => d.id === action.day.id);
      return {
        ...state,
        days: found
          ? state.days.map((d) => (d.id === action.day.id ? action.day : d))
          : [action.day, ...state.days],
      };
    }
    case 'dayAdded':
      return { ...state, days: [action.day, ...state.days] };
    case 'dayRemoved':
      return { ...state, days: state.days.filter((d) => d.id !== action.dayId) };
    case 'dayReplaced':
      return { ...state, days: state.days.map((d) => (d.id === action.day.id ? action.day : d)) };

    case 'mealAdded':
      return {
        ...state,
        days: mapDay(state.days, action.dayId, (d) => ({ ...d, meals: [...d.meals, action.meal] })),
      };
    case 'mealRemoved':
      return {
        ...state,
        days: mapDay(state.days, action.dayId, (d) => ({
          ...d,
          meals: d.meals.filter((m) => m.id !== action.mealId),
        })),
      };
    case 'mealPatched':
      return {
        ...state,
        days: mapDay(state.days, action.dayId, (d) =>
          mapMeal(d, action.mealId, (m) => ({ ...m, ...action.patch })),
        ),
      };

    case 'ingredientUpserted':
      return {
        ...state,
        days: mapDay(state.days, action.dayId, (d) =>
          mapMeal(d, action.mealId, (m) => ({
            ...m,
            // Adding/editing an ingredient auto-logs a copied meal (R30).
            logged: m.origin === 'template' ? true : m.logged,
            ingredients: m.ingredients.some((i) => i.id === action.ingredient.id)
              ? m.ingredients.map((i) => (i.id === action.ingredient.id ? action.ingredient : i))
              : [...m.ingredients, action.ingredient],
          })),
        ),
      };
    case 'ingredientRemoved':
      return {
        ...state,
        days: mapDay(state.days, action.dayId, (d) =>
          mapMeal(d, action.mealId, (m) => {
            const ingredients = m.ingredients.filter((i) => i.id !== action.ingredientId);
            return {
              ...m,
              // Removing the last ingredient returns a copied meal to unlogged (R31).
              logged: m.origin === 'template' && ingredients.length === 0 ? false : m.logged,
              ingredients,
            };
          }),
        ),
      };

    case 'templatesSet':
      return { ...state, templates: action.templates };
    case 'templateAdded':
      return { ...state, templates: [...state.templates, action.template] };
    case 'templateReplaced':
      return {
        ...state,
        templates: state.templates.map((t) => (t.id === action.template.id ? action.template : t)),
      };
    case 'templateRemoved':
      return { ...state, templates: state.templates.filter((t) => t.id !== action.templateId) };
    case 'templatesReordered': {
      const byId = new Map(state.templates.map((tpl) => [tpl.id, tpl]));
      const reordered = action.orderedIds
        .map((id) => byId.get(id))
        .filter((tpl): tpl is MealTemplate => tpl != null);
      return {
        ...state,
        templates: reordered.length === state.templates.length ? reordered : state.templates,
      };
    }
    case 'templateIngredientUpserted':
      return {
        ...state,
        templates: state.templates.map((tpl) =>
          tpl.id === action.templateId
            ? {
                ...tpl,
                ingredients: tpl.ingredients.some((i) => i.id === action.ingredient.id)
                  ? tpl.ingredients.map((i) =>
                      i.id === action.ingredient.id ? action.ingredient : i,
                    )
                  : [...tpl.ingredients, action.ingredient],
              }
            : tpl,
        ),
      };
    case 'templateIngredientRemoved':
      return {
        ...state,
        templates: state.templates.map((tpl) =>
          tpl.id === action.templateId
            ? { ...tpl, ingredients: tpl.ingredients.filter((i) => i.id !== action.ingredientId) }
            : tpl,
        ),
      };

    case 'profileSet':
      return { ...state, profile: action.profile };
    case 'profilePatched':
      return {
        ...state,
        profile: state.profile ? { ...state.profile, ...action.data } : state.profile,
      };

    default:
      return state;
  }
}
