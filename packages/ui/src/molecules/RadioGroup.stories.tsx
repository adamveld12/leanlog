import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { RadioGroup } from './RadioGroup';

function Demo() {
  const [value, setValue] = useState<'a' | 'b'>('a');
  return (
    <RadioGroup
      name="demo"
      label="Mode"
      value={value}
      onChange={setValue}
      options={[
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
      ]}
    />
  );
}

const meta: Meta<typeof Demo> = {
  title: 'Design System/Molecules/RadioGroup',
  component: Demo,
};

export default meta;

type Story = StoryObj<typeof Demo>;

export const Default: Story = {};
