import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ACTIVITY_LABEL, BODYWEIGHT_FALLBACK_MULTIPLIER, addDaysIso } from '@leanlog/data-access';
import { Screen } from '../ui/atoms/Screen';
import { Text } from '../ui/atoms/Text';
import { AddMealCard } from '../ui/organisms/AddMealCard';
import { DayNavigatorCard } from '../ui/organisms/DayNavigatorCard';
import { MealCard } from '../ui/organisms/MealCard';
import { TotalsCard } from '../ui/organisms/TotalsCard';
import { useMobileStore } from '../state/MobileStore';
import { latestBodyFat, selectDayView } from '../state/selectors';
import { formatDayHeading } from './format';
import { useRunAction } from './useRunAction';

export function TodayScreen() {
  const { state, actions } = useMobileStore();
  const router = useRouter();
  // null follows "today", so the screen moves on at midnight.
  const [selected, setSelected] = useState<string | null>(null);
  const { error, run } = useRunAction();

  if (state.status === 'loading') {
    return (
      <Screen>
        <Text variant="helper">Loading…</Text>
      </Screen>
    );
  }
  if (state.status === 'error') {
    return (
      <Screen>
        <Text variant="warning">{`Couldn't load your data: ${state.message}`}</Text>
      </Screen>
    );
  }

  const { data, today } = state;
  const date = selected ?? today;
  const view = selectDayView(data, date, today);
  const profile = data.profile;

  let basisCaption: string | null = null;
  if (view.day?.basis === 'katch') {
    const bf = latestBodyFat(data, date);
    const activity = profile.activityLevel ? ACTIVITY_LABEL[profile.activityLevel] : 'No activity';
    basisCaption = `Katch · BF ${bf?.pct ?? '?'}% · ${activity}`;
  } else if (view.day) {
    basisCaption = `Bodyweight × ${BODYWEIGHT_FALLBACK_MULTIPLIER}`;
  }

  return (
    <Screen>
      <DayNavigatorCard
        title={formatDayHeading(date)}
        onPrevious={() => setSelected(addDaysIso(date, -1))}
        onNext={() => setSelected(addDaysIso(date, 1))}
        nextDisabled={date >= today}
      />
      <TotalsCard
        consumed={{
          calories: view.totals.calories,
          protein: view.totals.protein,
          carbs: view.totals.carbs,
          fat: view.totals.fat,
        }}
        targets={
          view.targets && {
            calories: view.targets.calories,
            protein: view.targets.protein,
            carbs: view.targets.carbs,
            fat: view.targets.fat,
          }
        }
        basisCaption={basisCaption}
        locked={!view.editable}
        onCalculateBodyFat={
          view.editable && view.day?.basis === 'bodyweight'
            ? () => router.push('/body-fat')
            : undefined
        }
      />
      {view.meals.map(({ meal, ingredients, totals }) => (
        <MealCard
          key={meal.id}
          name={meal.name}
          totalCalories={totals.calories}
          ingredients={ingredients}
          onAddFood={
            view.editable
              ? () => router.push({ pathname: '/meal/[id]', params: { id: meal.id } })
              : undefined
          }
        />
      ))}
      {view.editable ? (
        <AddMealCard onAdd={(name) => void run(() => actions.addMeal(name))} />
      ) : null}
      {error ? <Text variant="warning">{error}</Text> : null}
    </Screen>
  );
}
