import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Field } from './Field';
import { Radio } from './Radio';
import { SectionHeading } from './SectionHeading';
import { Text } from './Text';

function Demo() {
  const [value, setValue] = useState('deficit');
  return (
    <fieldset className="flex min-w-[320px] flex-col gap-3 rounded-[14px] border border-[var(--ll-line)] bg-[var(--ll-surface)] p-4">
      <SectionHeading as="h2">Calorie target</SectionHeading>
      {[
        ['deficit', 'Deficit (10x body weight)'],
        ['maintenance', 'Maintenance (15x body weight)'],
      ].map(([optionValue, label]) => (
        <Field key={optionValue} className="flex-row items-center gap-2">
          <Radio
            name="calorie-target-demo"
            value={optionValue}
            checked={value === optionValue}
            onChange={() => setValue(optionValue)}
          />
          <Text as="span" variant="body">
            {label}
          </Text>
        </Field>
      ))}
    </fieldset>
  );
}

const meta: Meta<typeof Demo> = {
  title: 'Design System/Atoms/Radio',
  component: Demo,
};
export default meta;
type Story = StoryObj<typeof Demo>;
export const Default: Story = {};
export const Disabled: Story = {
  render: () => (
    <Field className="flex-row items-center gap-2">
      <Radio name="radio-disabled-demo" value="x" checked readOnly disabled />
      <Text as="span" variant="body">
        Disabled option
      </Text>
    </Field>
  ),
};
