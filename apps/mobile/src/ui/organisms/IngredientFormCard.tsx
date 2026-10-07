import { useState } from 'react';
import type { NutritionFields } from '@leanlog/data-access';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { NumberField } from '../atoms/NumberField';
import { RadioGroup } from '../atoms/RadioGroup';
import { TextField } from '../atoms/TextField';
import { EMPTY_NUTRITION, type NutritionDraft } from '../molecules/nutritionDraft';
import { NutritionInputs } from '../molecules/NutritionInputs';

export type ManualIngredient = NutritionFields & { name: string; grams: number };

type Props = {
  // `saveAsFood` copies the entry into the saved-foods list in one tap (R6).
  onSubmit: (ingredient: ManualIngredient, saveAsFood: boolean) => void;
};

const saveOptions = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' },
] as const;

export function IngredientFormCard({ onSubmit }: Props) {
  const [name, setName] = useState('');
  const [grams, setGrams] = useState<number | null>(null);
  const [nutrition, setNutrition] = useState<NutritionDraft>(EMPTY_NUTRITION);
  const [save, setSave] = useState<'yes' | 'no'>('no');

  const valid = name.trim() !== '' && grams != null && grams > 0 && nutrition.calories != null;

  return (
    <Card title="Add manually">
      <TextField label="Food name" value={name} onChangeText={setName} />
      <NumberField label="Grams" unit="g" value={grams} onChangeValue={setGrams} />
      <NutritionInputs value={nutrition} onChange={setNutrition} />
      <RadioGroup label="Save to my foods" options={saveOptions} value={save} onChange={setSave} />
      <Button
        label="Add to meal"
        disabled={!valid}
        onPress={() => {
          if (!valid || grams == null || nutrition.calories == null) return;
          onSubmit(
            {
              name: name.trim(),
              grams,
              calories: nutrition.calories,
              fat: nutrition.fat ?? 0,
              saturatedFat: nutrition.saturatedFat ?? 0,
              carbs: nutrition.carbs ?? 0,
              fiber: nutrition.fiber ?? 0,
              protein: nutrition.protein ?? 0,
            },
            save === 'yes',
          );
        }}
      />
    </Card>
  );
}
