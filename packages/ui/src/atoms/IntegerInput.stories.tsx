import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Field } from './Field';
import { HelperText } from './HelperText';
import { IntegerInput } from './IntegerInput';

function Demo() {
  const [value, setValue] = useState(4);
  return (
    <Field label="Total meals for the day">
      <IntegerInput value={value} onChange={setValue} min={0} step={1} />
      <HelperText>Use the browser stepper arrows or type a whole number.</HelperText>
    </Field>
  );
}

const meta: Meta<typeof Demo> = {
  title: 'Design System/Atoms/IntegerInput',
  component: Demo,
};
export default meta;
type Story = StoryObj<typeof Demo>;
export const Default: Story = {};
