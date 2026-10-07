import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { EMPTY_NUTRITION, type NutritionDraft } from './nutritionDraft';
import { NutritionInputs } from './NutritionInputs';

const meta = {
  title: 'Design System/Molecules/NutritionInputs',
  component: NutritionInputs,
  args: { value: EMPTY_NUTRITION, onChange: () => {} },
} satisfies Meta<typeof NutritionInputs>;
export default meta;
type Story = StoryObj<typeof meta>;

function Interactive() {
  const [value, setValue] = useState<NutritionDraft>({ ...EMPTY_NUTRITION, calories: 380 });
  return <NutritionInputs value={value} onChange={setValue} />;
}

export const Default: Story = { render: () => <Interactive /> };
