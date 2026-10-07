import type { Meta, StoryObj } from '@storybook/react-native';
import { VTaperCard } from './VTaperCard';

const meta = {
  title: 'Design System/Organisms/VTaperCard',
  component: VTaperCard,
  args: { ratio: 50 / 32 },
} satisfies Meta<typeof VTaperCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const BelowTarget: Story = {};
export const Reached: Story = { args: { ratio: 1.65 } };
export const NoData: Story = { args: { ratio: null } };
