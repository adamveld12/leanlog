import type { Meta, StoryObj } from '@storybook/react-native';
import { BackupCard } from './BackupCard';

const meta = {
  title: 'Design System/Organisms/BackupCard',
  component: BackupCard,
  args: { onExport: () => {}, onImport: () => {} },
} satisfies Meta<typeof BackupCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
