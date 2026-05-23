import type { Meta, StoryObj } from '@storybook/react';
import { FileInput } from './FileInput';

const meta: Meta<typeof FileInput> = {
  title: 'Design System/Atoms/FileInput',
  component: FileInput,
  args: { accept: 'image/*' },
};
export default meta;
type Story = StoryObj<typeof FileInput>;
export const Default: Story = {};
