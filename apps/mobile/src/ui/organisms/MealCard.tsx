import { View } from 'react-native';
import { spacing } from '../theme';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Text } from '../atoms/Text';

type IngredientRow = { id: string; name: string; grams: number; calories: number };

type Props = {
  name: string;
  totalCalories: number;
  ingredients: readonly IngredientRow[];
  // Present only when the day is editable.
  onAddFood?: () => void;
  onRemoveIngredient?: (id: string) => void;
};

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export function MealCard({
  name,
  totalCalories,
  ingredients,
  onAddFood,
  onRemoveIngredient,
}: Props) {
  return (
    <Card title={name} headerNote={`${fmt(totalCalories)} kcal total`}>
      {ingredients.length === 0 ? <Text variant="helper">No food yet.</Text> : null}
      {ingredients.map((i) => (
        <View
          key={i.id}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text>{`${i.name} · ${fmt(i.grams)} g`}</Text>
            <Text variant="helper">{`${fmt(i.calories)} kcal`}</Text>
          </View>
          {onRemoveIngredient ? (
            <Button
              label="Remove"
              variant="ghost"
              onPress={() => onRemoveIngredient(i.id)}
              accessibilityLabel={`Remove ${i.name}`}
            />
          ) : null}
        </View>
      ))}
      {onAddFood ? <Button label="Add food" variant="secondary" onPress={onAddFood} /> : null}
    </Card>
  );
}
