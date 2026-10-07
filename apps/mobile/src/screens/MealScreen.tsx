import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Button } from '../ui/atoms/Button';
import { Card } from '../ui/atoms/Card';
import { Screen } from '../ui/atoms/Screen';
import { Text } from '../ui/atoms/Text';
import { TextField } from '../ui/atoms/TextField';
import { IngredientFormCard } from '../ui/organisms/IngredientFormCard';
import { MealCard } from '../ui/organisms/MealCard';
import { SavedFoodPickerCard } from '../ui/organisms/SavedFoodPickerCard';
import { useMobileStore } from '../state/MobileStore';
import { selectDayView } from '../state/selectors';
import { useRunAction } from './useRunAction';

type Mode = 'menu' | 'manual' | 'saved';

export function MealScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, actions } = useMobileStore();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('menu');
  const [name, setName] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { error, run } = useRunAction();

  if (state.status !== 'ready') {
    return (
      <Screen>
        <Text variant="helper">Loading…</Text>
      </Screen>
    );
  }
  const { data, today } = state;
  const meal = data.meals.find((m) => m.id === id);
  if (!meal) {
    return (
      <Screen>
        <Text variant="helper">This meal no longer exists.</Text>
      </Screen>
    );
  }
  const view = selectDayView(data, meal.date, today);
  const entry = view.meals.find((m) => m.meal.id === meal.id);
  if (!entry) return null;

  return (
    <Screen>
      <MealCard
        name={meal.name}
        totalCalories={entry.totals.calories}
        ingredients={entry.ingredients}
        onRemoveIngredient={
          view.editable
            ? (ingredientId) => void run(() => actions.removeIngredient(ingredientId))
            : undefined
        }
      />
      {!view.editable ? (
        <Text variant="helper">This day is locked. Only today can be edited.</Text>
      ) : (
        <>
          {mode === 'menu' ? (
            <Card title="Add food">
              <Button
                label="Add from saved foods"
                variant="secondary"
                onPress={() => setMode('saved')}
              />
              <Button label="Add manually" variant="secondary" onPress={() => setMode('manual')} />
            </Card>
          ) : null}
          {mode === 'saved' ? (
            <SavedFoodPickerCard
              foods={data.savedFoods}
              onAdd={(foodId, grams) =>
                void run(async () => {
                  await actions.addIngredientFromSavedFood(meal.id, foodId, grams);
                  setMode('menu');
                })
              }
            />
          ) : null}
          {mode === 'manual' ? (
            <IngredientFormCard
              onSubmit={(ingredient, saveAsFood) =>
                void run(async () => {
                  let savedFoodId: string | null = null;
                  if (saveAsFood) {
                    const food = await actions.createSavedFood(
                      {
                        name: ingredient.name,
                        referenceGrams: ingredient.grams,
                        calories: ingredient.calories,
                        fat: ingredient.fat,
                        saturatedFat: ingredient.saturatedFat,
                        carbs: ingredient.carbs,
                        fiber: ingredient.fiber,
                        protein: ingredient.protein,
                      },
                      'entry',
                    );
                    savedFoodId = food.id;
                  }
                  await actions.addIngredient(meal.id, { ...ingredient, savedFoodId });
                  setMode('menu');
                })
              }
            />
          ) : null}
          {mode !== 'menu' ? (
            <Card>
              <Button label="Cancel" variant="ghost" onPress={() => setMode('menu')} />
            </Card>
          ) : null}
          <Card title="Meal">
            <TextField label="Rename meal" value={name ?? meal.name} onChangeText={setName} />
            <Button
              label="Rename"
              variant="secondary"
              disabled={(name ?? meal.name).trim() === ''}
              onPress={() =>
                void run(() => actions.renameMeal(meal.id, (name ?? meal.name).trim()))
              }
            />
            {confirmDelete ? (
              <Button
                label="Confirm delete"
                variant="danger"
                onPress={() =>
                  void run(async () => {
                    await actions.deleteMeal(meal.id);
                    router.back();
                  })
                }
              />
            ) : (
              <Button label="Delete meal" variant="danger" onPress={() => setConfirmDelete(true)} />
            )}
          </Card>
        </>
      )}
      {error ? <Text variant="warning">{error}</Text> : null}
    </Screen>
  );
}
