import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { UnitsProvider } from '../units';
import { NumberField } from './NumberField';

const meta = {
  title: 'Design System/Atoms/NumberField',
  component: NumberField,
  args: { label: 'Weight', value: 180.8, onChangeValue: () => {} },
} satisfies Meta<typeof NumberField>;
export default meta;
type Story = StoryObj<typeof meta>;

function Interactive({ system }: { system: 'imperial' | 'metric' }) {
  const [weight, setWeight] = useState<number | null>(180.8);
  const [waist, setWaist] = useState<number | null>(34);
  const [grams, setGrams] = useState<number | null>(50);
  return (
    <UnitsProvider unitSystem={system}>
      <View style={{ gap: 12 }}>
        <NumberField label="Weight" quantity="weight" value={weight} onChangeValue={setWeight} />
        <NumberField label="Waist" quantity="length" value={waist} onChangeValue={setWaist} />
        <NumberField label="Grams" unit="g" value={grams} onChangeValue={setGrams} />
      </View>
    </UnitsProvider>
  );
}

export const Imperial: Story = { render: () => <Interactive system="imperial" /> };
export const Metric: Story = { render: () => <Interactive system="metric" /> };
