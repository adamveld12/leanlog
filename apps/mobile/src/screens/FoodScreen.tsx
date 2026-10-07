import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../ui/atoms/Screen';
import { Text } from '../ui/atoms/Text';
import { SavedFoodFormCard } from '../ui/organisms/SavedFoodFormCard';
import { useMobileStore } from '../state/MobileStore';
import { useRunAction } from './useRunAction';

export function FoodScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, actions } = useMobileStore();
  const router = useRouter();
  const { error, run } = useRunAction();
  if (state.status !== 'ready') {
    return (
      <Screen>
        <Text variant="helper">Loading…</Text>
      </Screen>
    );
  }
  const isNew = id === 'new';
  const food = isNew ? undefined : state.data.savedFoods.find((f) => f.id === id);
  if (!isNew && !food) {
    return (
      <Screen>
        <Text variant="helper">This food no longer exists.</Text>
      </Screen>
    );
  }
  return (
    <Screen>
      <SavedFoodFormCard
        initial={food}
        onSubmit={(values) =>
          void run(async () => {
            if (food) await actions.updateSavedFood(food.id, values);
            else await actions.createSavedFood(values);
            router.back();
          })
        }
        onDelete={
          food
            ? () =>
                void run(async () => {
                  await actions.deleteSavedFood(food.id);
                  router.back();
                })
            : undefined
        }
      />
      {error ? <Text variant="warning">{error}</Text> : null}
    </Screen>
  );
}
