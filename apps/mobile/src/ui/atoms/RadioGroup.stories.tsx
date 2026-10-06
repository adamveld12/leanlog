import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { RadioGroup } from './RadioGroup';

const options = [
  { value: 'navy', label: 'Navy tape' },
  { value: 'jp3', label: 'Skinfold' },
] as const;

const meta = {
  title: 'Design System/Atoms/RadioGroup',
  component: RadioGroup,
  args: { label: 'Method', options, value: 'navy', onChange: () => {} },
} satisfies Meta<typeof RadioGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

function Interactive() {
  const [value, setValue] = useState<'navy' | 'jp3'>('navy');
  return <RadioGroup label="Method" options={options} value={value} onChange={setValue} />;
}

export const Default: Story = { render: () => <Interactive /> };
