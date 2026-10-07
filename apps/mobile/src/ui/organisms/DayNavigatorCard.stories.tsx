import type { Meta, StoryObj } from '@storybook/react-native';
import { DayNavigatorCard } from './DayNavigatorCard';

const meta = {
  title: 'Design System/Organisms/DayNavigatorCard',
  component: DayNavigatorCard,
  args: { title: 'Tue, Oct 6', onPrevious: () => {}, onNext: () => {}, nextDisabled: true },
} satisfies Meta<typeof DayNavigatorCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Today: Story = {};
export const PastDay: Story = { args: { title: 'Mon, Oct 5', nextDisabled: false } };
