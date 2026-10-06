import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { Select } from './Select';

const options = [
  { value: 'none', label: 'None' },
  { value: 'sedentary', label: 'Sedentary' },
  { value: 'moderate', label: 'Moderate' },
] as const;

const meta = {
  title: 'Design System/Atoms/Select',
  component: Select,
  args: { label: 'Activity', options, value: 'moderate', onChange: () => {} },
} satisfies Meta<typeof Select>;
export default meta;
type Story = StoryObj<typeof meta>;

function Interactive() {
  const [value, setValue] = useState<'none' | 'sedentary' | 'moderate' | null>('moderate');
  return <Select label="Activity" options={options} value={value} onChange={setValue} />;
}

export const Default: Story = { render: () => <Interactive /> };
