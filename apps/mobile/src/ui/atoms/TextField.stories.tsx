import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { TextField } from './TextField';

const meta = {
  title: 'Design System/Atoms/TextField',
  component: TextField,
  args: { label: 'Food name', value: '', onChangeText: () => {} },
} satisfies Meta<typeof TextField>;
export default meta;
type Story = StoryObj<typeof meta>;

function Interactive() {
  const [value, setValue] = useState('Oats');
  return <TextField label="Food name" value={value} onChangeText={setValue} />;
}

export const Default: Story = { render: () => <Interactive /> };
