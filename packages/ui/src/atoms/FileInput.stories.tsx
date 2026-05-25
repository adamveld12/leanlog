import type { Meta, StoryObj } from '@storybook/react';
import { Field } from './Field';
import { FileInput } from './FileInput';
import { HelperText } from './HelperText';
import { SectionHeading } from './SectionHeading';

function Demo() {
  return (
    <div className="flex min-w-[320px] flex-col gap-3 rounded-[14px] border border-[var(--ll-line)] bg-[var(--ll-surface)] p-4">
      <SectionHeading>Nutrition label photo</SectionHeading>
      <HelperText as="p">Choose an image from your device to scan nutrition values.</HelperText>
      <Field label="Upload image">
        <FileInput accept="image/*" />
      </Field>
    </div>
  );
}

const meta: Meta<typeof Demo> = {
  title: 'Design System/Atoms/FileInput',
  component: Demo,
};
export default meta;
type Story = StoryObj<typeof Demo>;
export const Default: Story = {};
