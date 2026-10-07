import { useState } from 'react';
import { scaleSavedFood, type SavedFood } from '@leanlog/data-access';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { NumberField } from '../atoms/NumberField';
import { Text } from '../atoms/Text';
import { TextField } from '../atoms/TextField';

type Props = {
  foods: readonly SavedFood[];
  onAdd: (foodId: string, grams: number) => void;
};

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

// Pick a saved food, enter grams, and see the scaled values before logging (R7).
export function SavedFoodPickerCard({ foods, onAdd }: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SavedFood | null>(null);
  const [grams, setGrams] = useState<number | null>(null);

  if (selected) {
    const preview = grams != null && grams > 0 ? scaleSavedFood(selected, grams) : null;
    return (
      <Card title={selected.name}>
        <NumberField label="Grams" unit="g" value={grams} onChangeValue={setGrams} />
        {preview ? (
          <>
            <Text>{`${fmt(preview.calories)} kcal`}</Text>
            <Text variant="helper">
              {`P ${preview.protein} · C ${preview.carbs} · F ${preview.fat} (g)`}
            </Text>
          </>
        ) : null}
        <Button
          label="Add to meal"
          disabled={!preview}
          onPress={() => grams != null && onAdd(selected.id, grams)}
        />
        <Button label="Choose another" variant="ghost" onPress={() => setSelected(null)} />
      </Card>
    );
  }

  const q = query.trim().toLowerCase();
  const matches = foods.filter((f) => f.name.toLowerCase().includes(q));
  return (
    <Card title="Saved foods">
      <TextField label="Search" value={query} onChangeText={setQuery} />
      {foods.length === 0 ? <Text variant="helper">No saved foods yet.</Text> : null}
      {matches.map((f) => (
        <Button
          key={f.id}
          label={f.name}
          variant="secondary"
          onPress={() => {
            setSelected(f);
            setGrams(f.referenceGrams);
          }}
        />
      ))}
    </Card>
  );
}
