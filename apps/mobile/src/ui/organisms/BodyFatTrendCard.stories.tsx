import type { Meta, StoryObj } from '@storybook/react-native';
import { BodyFatTrendCard } from './BodyFatTrendCard';

const meta = {
  title: 'Design System/Organisms/BodyFatTrendCard',
  component: BodyFatTrendCard,
  args: {
    results: [
      { date: '2026-09-23', pct: 17, method: 'navy' },
      { date: '2026-10-03', pct: 16, method: 'jp3' },
    ],
    onCalculate: () => {},
  },
} satisfies Meta<typeof BodyFatTrendCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithResults: Story = {};
export const Empty: Story = { args: { results: [] } };
