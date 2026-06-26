import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { NumberInput } from './NumberInput';

function Demo({
  label,
  initialValue,
  placeholder,
  disabled,
  allowNegative,
}: {
  label: string;
  initialValue: number | null;
  placeholder?: string;
  disabled?: boolean;
  allowNegative?: boolean;
}) {
  const [value, setValue] = useState<number | null>(initialValue);
  return (
    <NumberInput
      label={label}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      allowNegative={allowNegative}
      onChange={setValue}
    />
  );
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

export const Empty: Story = {
  args: { label: 'Weight (g)', initialValue: null, placeholder: 'e.g. 120' },
};

export const Disabled: Story = {
  args: { label: '# of Servings', initialValue: 0, disabled: true },
};

export const WithNegativeValue: Story = {
  args: { label: 'Calorie delta', initialValue: -250, allowNegative: true },
};
