import { useState } from 'react';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { TextField } from '../atoms/TextField';

export function AddMealCard({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState('');
  const trimmed = name.trim();
  return (
    <Card title="Add meal">
      <TextField label="Meal name" value={name} onChangeText={setName} placeholder="Breakfast" />
      <Button
        label="Add meal"
        disabled={trimmed === ''}
        onPress={() => {
          onAdd(trimmed);
          setName('');
        }}
      />
    </Card>
  );
}
