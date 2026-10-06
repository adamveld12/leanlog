import { useRouter } from 'expo-router';
import { Button } from '../ui/atoms/Button';
import { Card } from '../ui/atoms/Card';
import { Screen } from '../ui/atoms/Screen';
import { Text } from '../ui/atoms/Text';
import { useMobileStore } from '../state/MobileStore';

export function FoodsScreen() {
  const { state } = useMobileStore();
  const router = useRouter();
  if (state.status !== 'ready') {
    return (
      <Screen>
        <Text variant="helper">Loading…</Text>
      </Screen>
    );
  }
  const foods = [...state.data.savedFoods].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Screen>
      <Card
        title="Saved foods"
        headerAction={{
          label: 'New food',
          onPress: () => router.push({ pathname: '/food/[id]', params: { id: 'new' } }),
        }}
      >
        {foods.length === 0 ? (
          <Text variant="helper">No saved foods yet. Save one from a meal or create it here.</Text>
        ) : null}
        {foods.map((f) => (
          <Button
            key={f.id}
            label={`${f.name} · ${Math.round(f.calories)} kcal / ${f.referenceGrams} g`}
            variant="secondary"
            onPress={() => router.push({ pathname: '/food/[id]', params: { id: f.id } })}
          />
        ))}
      </Card>
    </Screen>
  );
}
