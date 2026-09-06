import type {
  DailyMealLog,
  Goal,
  Meal,
  Plan,
  PlanSummary,
  PlanMeal,
  UserProfile,
} from '@leanlog/data-access';

type MealIngredient = Meal['ingredients'][number];
type PlanIngredient = PlanMeal['ingredients'][number];
type PlanSummaryMeal = PlanSummary['meals'][number];

function toSummaryMeal(meal: PlanMeal): PlanSummaryMeal {
  return {
    id: meal.id,
    planId: meal.planId,
    name: meal.name,
    position: meal.position,
    createdAt: meal.createdAt,
    updatedAt: meal.updatedAt,
  };
}

export type StoreState = {
  days: DailyMealLog[];
  plans: PlanSummary[];
  // Full plan trees (with ingredients), loaded on demand for the plan editor
  // (R41 — app boot fetches summaries only).
  planDetails: Plan[];
  goals: Goal[];
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
};

export const initialStoreState: StoreState = {
  days: [],
  plans: [],
  planDetails: [],
  goals: [],
  profile: null,
  loading: true,
  error: null,
};

export type StoreAction =
  | {
      type: 'loaded';
      days: DailyMealLog[];
      profile: UserProfile;
      plans: PlanSummary[];
      goals: Goal[];
    }
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
  | { type: 'plansSet'; plans: PlanSummary[] }
  | { type: 'planSummaryAdded'; plan: PlanSummary }
  | { type: 'planSummaryReplaced'; plan: PlanSummary }
  | { type: 'planRemoved'; planId: string }
  | { type: 'plansReordered'; orderedIds: string[] }
  | { type: 'planDetailUpserted'; plan: Plan }
  | { type: 'planMealAdded'; planId: string; meal: PlanMeal }
  | { type: 'planMealRenamed'; planId: string; mealId: string; name: string }
  | { type: 'planMealRemoved'; planId: string; mealId: string }
  | { type: 'planMealsReordered'; planId: string; meals: PlanMeal[] }
  | { type: 'planIngredientUpserted'; planId: string; mealId: string; ingredient: PlanIngredient }
  | { type: 'planIngredientRemoved'; planId: string; mealId: string; ingredientId: string }
  | { type: 'profileSet'; profile: UserProfile | null }
  | { type: 'profilePatched'; data: Partial<UserProfile> }
  | { type: 'goalsSet'; goals: Goal[] }
  | { type: 'goalAdded'; goal: Goal }
  | { type: 'goalReplaced'; goal: Goal }
  | { type: 'goalRemoved'; goalId: string };

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
        plans: action.plans,
        goals: action.goals,
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

    case 'plansSet':
      return { ...state, plans: action.plans };
    case 'planSummaryAdded':
      return { ...state, plans: [...state.plans, action.plan] };
    case 'planSummaryReplaced':
      return {
        ...state,
        plans: state.plans.map((p) => (p.id === action.plan.id ? action.plan : p)),
      };
    case 'planRemoved':
      return {
        ...state,
        plans: state.plans.filter((p) => p.id !== action.planId),
        planDetails: state.planDetails.filter((p) => p.id !== action.planId),
      };
    case 'plansReordered': {
      const byId = new Map(state.plans.map((p) => [p.id, p]));
      const reordered = action.orderedIds
        .map((id) => byId.get(id))
        .filter((p): p is PlanSummary => p != null);
      return { ...state, plans: reordered.length === state.plans.length ? reordered : state.plans };
    }
    case 'planDetailUpserted': {
      const found = state.planDetails.some((p) => p.id === action.plan.id);
      return {
        ...state,
        planDetails: found
          ? state.planDetails.map((p) => (p.id === action.plan.id ? action.plan : p))
          : [...state.planDetails, action.plan],
      };
    }
    case 'planMealAdded':
      return {
        ...state,
        plans: state.plans.map((p) =>
          p.id === action.planId ? { ...p, meals: [...p.meals, toSummaryMeal(action.meal)] } : p,
        ),
        planDetails: state.planDetails.map((p) =>
          p.id === action.planId ? { ...p, meals: [...p.meals, action.meal] } : p,
        ),
      };
    case 'planMealRenamed':
      return {
        ...state,
        plans: state.plans.map((p) =>
          p.id === action.planId
            ? {
                ...p,
                meals: p.meals.map((m) =>
                  m.id === action.mealId ? { ...m, name: action.name } : m,
                ),
              }
            : p,
        ),
        planDetails: state.planDetails.map((p) =>
          p.id === action.planId
            ? {
                ...p,
                meals: p.meals.map((m) =>
                  m.id === action.mealId ? { ...m, name: action.name } : m,
                ),
              }
            : p,
        ),
      };
    case 'planMealRemoved':
      return {
        ...state,
        plans: state.plans.map((p) =>
          p.id === action.planId
            ? { ...p, meals: p.meals.filter((m) => m.id !== action.mealId) }
            : p,
        ),
        planDetails: state.planDetails.map((p) =>
          p.id === action.planId
            ? { ...p, meals: p.meals.filter((m) => m.id !== action.mealId) }
            : p,
        ),
      };
    case 'planMealsReordered':
      return {
        ...state,
        plans: state.plans.map((p) =>
          p.id === action.planId ? { ...p, meals: action.meals.map(toSummaryMeal) } : p,
        ),
        planDetails: state.planDetails.map((p) =>
          p.id === action.planId ? { ...p, meals: action.meals } : p,
        ),
      };
    case 'planIngredientUpserted':
      return {
        ...state,
        planDetails: state.planDetails.map((p) =>
          p.id === action.planId
            ? {
                ...p,
                meals: p.meals.map((m) =>
                  m.id === action.mealId
                    ? {
                        ...m,
                        ingredients: m.ingredients.some((i) => i.id === action.ingredient.id)
                          ? m.ingredients.map((i) =>
                              i.id === action.ingredient.id ? action.ingredient : i,
                            )
                          : [...m.ingredients, action.ingredient],
                      }
                    : m,
                ),
              }
            : p,
        ),
      };
    case 'planIngredientRemoved':
      return {
        ...state,
        planDetails: state.planDetails.map((p) =>
          p.id === action.planId
            ? {
                ...p,
                meals: p.meals.map((m) =>
                  m.id === action.mealId
                    ? {
                        ...m,
                        ingredients: m.ingredients.filter((i) => i.id !== action.ingredientId),
                      }
                    : m,
                ),
              }
            : p,
        ),
      };

    case 'profileSet':
      return { ...state, profile: action.profile };
    case 'profilePatched':
      return {
        ...state,
        profile: state.profile ? { ...state.profile, ...action.data } : state.profile,
      };

    case 'goalsSet':
      return { ...state, goals: action.goals };
    case 'goalAdded':
      return { ...state, goals: [...state.goals, action.goal] };
    case 'goalReplaced':
      return {
        ...state,
        goals: state.goals.map((g) => (g.id === action.goal.id ? action.goal : g)),
      };
    case 'goalRemoved':
      return { ...state, goals: state.goals.filter((g) => g.id !== action.goalId) };

    default:
      return state;
  }
}
