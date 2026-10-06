import { useState } from 'react';
import type { NutritionFields } from '@leanlog/data-access';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { NumberField } from '../atoms/NumberField';
import { TextField } from '../atoms/TextField';
import { EMPTY_NUTRITION, type NutritionDraft } from '../molecules/nutritionDraft';
import { NutritionInputs } from '../molecules/NutritionInputs';

export type SavedFoodValues = NutritionFields & { name: string; referenceGrams: number };

type Props = {
  initial?: SavedFoodValues;
  onSubmit: (values: SavedFoodValues) => void;
  onDelete?: () => void;
};

export function SavedFoodFormCard({ initial, onSubmit, onDelete }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [referenceGrams, setReferenceGrams] = useState<number | null>(
    initial?.referenceGrams ?? 100,
  );
  const [nutrition, setNutrition] = useState<NutritionDraft>(
    initial
      ? {
          calories: initial.calories,
          fat: initial.fat,
          saturatedFat: initial.saturatedFat,
          carbs: initial.carbs,
          fiber: initial.fiber,
          protein: initial.protein,
        }
      : EMPTY_NUTRITION,
  );
  const valid =
    name.trim() !== '' &&
    referenceGrams != null &&
    referenceGrams > 0 &&
    nutrition.calories != null;

  return (
    <Card title={initial ? 'Edit food' : 'New food'}>
      <TextField label="Food name" value={name} onChangeText={setName} />
      <NumberField
        label="Values are for"
        unit="g"
        value={referenceGrams}
        onChangeValue={setReferenceGrams}
      />
      <NutritionInputs value={nutrition} onChange={setNutrition} />
      <Button
        label="Save food"
        disabled={!valid}
        onPress={() => {
          if (!valid || referenceGrams == null || nutrition.calories == null) return;
          onSubmit({
            name: name.trim(),
            referenceGrams,
            calories: nutrition.calories,
            fat: nutrition.fat ?? 0,
            saturatedFat: nutrition.saturatedFat ?? 0,
            carbs: nutrition.carbs ?? 0,
            fiber: nutrition.fiber ?? 0,
            protein: nutrition.protein ?? 0,
          });
        }}
      />
      {onDelete ? <Button label="Delete food" variant="danger" onPress={onDelete} /> : null}
    </Card>
  );
}
