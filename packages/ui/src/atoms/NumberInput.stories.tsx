import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { NumberInput } from './NumberInput';

function Demo({
  label,
  initialValue,
  disabled,
}: {
  label: string;
  initialValue: number;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  return <NumberInput label={label} value={value} disabled={disabled} onChange={setValue} />;
}

const meta: Meta<typeof Demo> = {
  title: 'Design System/Atoms/NumberInput',
  component: Demo,
};

export default meta;
type Story = StoryObj<typeof Demo>;

export const Default: Story = {
  args: { label: 'Protein (g)', initialValue: 30 },
};

export const WithDecimal: Story = {
  args: { label: 'Weight (kg)', initialValue: 72.5 },
};

export const Disabled: Story = {
  args: { label: '# of Servings', initialValue: 0, disabled: true },
};
