import type { Meta, StoryObj } from '@storybook/react-native';
import { ConfirmDialog } from './ConfirmDialog';

const meta = {
  title: 'Design System/Molecules/ConfirmDialog',
  component: ConfirmDialog,
  args: {
    visible: true,
    title: 'Replace everything on this phone?',
    message: 'backup.json has 14 days and 3 meals. Importing replaces all your current data.',
    confirmLabel: 'Replace all data',
    onConfirm: () => {},
    onCancel: () => {},
  },
} satisfies Meta<typeof ConfirmDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Destructive: Story = {};
export const Neutral: Story = { args: { confirmVariant: 'primary', confirmLabel: 'Continue' } };
