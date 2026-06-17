import { describe, expect, it } from 'vitest';
import { initialStoreState, storeReducer, type StoreState } from '../state/storeReducer';
import type { DailyMealLog, Meal } from '@leanlog/data-access';

function meal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: 'm1',
    name: 'Breakfast',
    origin: 'template',
    logged: false,
    ingredients: [],
    ...overrides,
  } as unknown as Meal;
}

function day(meals: Meal[]): DailyMealLog {
  return { id: 'd1', date: '2026-06-15', meals } as unknown as DailyMealLog;
}

const ingredient = { id: 'ing1', name: 'Eggs' } as unknown as Meal['ingredients'][number];

function stateWith(meals: Meal[]): StoreState {
  return { ...initialStoreState, days: [day(meals)] };
}

describe('storeReducer', () => {
  it('loaded merges fetched days ahead of optimistic-only days', () => {
    const optimistic = { id: 'opt', date: 'x', meals: [] } as unknown as DailyMealLog;
    const fetched = { id: 'd1', date: 'y', meals: [] } as unknown as DailyMealLog;
    const next = storeReducer(
      { ...initialStoreState, days: [optimistic] },
      { type: 'loaded', days: [fetched], profile: {} as never, templates: [], goals: [] },
    );
    expect(next.days.map((d) => d.id)).toEqual(['d1', 'opt']);
  });

  it('ingredientUpserted auto-logs a template-origin meal (R30)', () => {
    const next = storeReducer(stateWith([meal()]), {
      type: 'ingredientUpserted',
      dayId: 'd1',
      mealId: 'm1',
      ingredient,
    });
    const m = next.days[0].meals[0];
    expect(m.logged).toBe(true);
    expect(m.ingredients).toHaveLength(1);
  });

  it('ingredientUpserted does not change logged for a regular meal', () => {
    const next = storeReducer(stateWith([meal({ origin: 'adhoc', logged: false })]), {
      type: 'ingredientUpserted',
      dayId: 'd1',
      mealId: 'm1',
      ingredient,
    });
    expect(next.days[0].meals[0].logged).toBe(false);
  });

  it('ingredientRemoved unlogs a template meal when the last ingredient goes (R31)', () => {
    const next = storeReducer(stateWith([meal({ logged: true, ingredients: [ingredient] })]), {
      type: 'ingredientRemoved',
      dayId: 'd1',
      mealId: 'm1',
      ingredientId: 'ing1',
    });
    const m = next.days[0].meals[0];
    expect(m.logged).toBe(false);
    expect(m.ingredients).toHaveLength(0);
  });

  it('ingredientRemoved keeps a template meal logged while ingredients remain', () => {
    const other = { id: 'ing2' } as unknown as Meal['ingredients'][number];
    const next = storeReducer(
      stateWith([meal({ logged: true, ingredients: [ingredient, other] })]),
      { type: 'ingredientRemoved', dayId: 'd1', mealId: 'm1', ingredientId: 'ing1' },
    );
    expect(next.days[0].meals[0].logged).toBe(true);
  });

  it('templatesReordered reorders by id and ignores incomplete id lists', () => {
    const t = (id: string) => ({ id, ingredients: [] }) as never;
    const base: StoreState = { ...initialStoreState, templates: [t('a'), t('b'), t('c')] };
    const reordered = storeReducer(base, {
      type: 'templatesReordered',
      orderedIds: ['c', 'a', 'b'],
    });
    expect(reordered.templates.map((x) => x.id)).toEqual(['c', 'a', 'b']);
    const partial = storeReducer(base, { type: 'templatesReordered', orderedIds: ['c', 'a'] });
    expect(partial.templates.map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('profilePatched merges into an existing profile only', () => {
    expect(
      storeReducer(initialStoreState, { type: 'profilePatched', data: { weightLbs: 1 } as never })
        .profile,
    ).toBeNull();
    const withProfile: StoreState = { ...initialStoreState, profile: { name: 'A' } as never };
    expect(
      storeReducer(withProfile, { type: 'profilePatched', data: { name: 'B' } as never }).profile,
    ).toMatchObject({ name: 'B' });
  });
});
