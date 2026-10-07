import type { Meta, StoryObj } from '@storybook/react-native';
import { TotalsCard } from './TotalsCard';

const meta = {
  title: 'Design System/Organisms/TotalsCard',
  component: TotalsCard,
  args: {
    consumed: { calories: 1240, protein: 88, carbs: 120, fat: 41 },
    targets: { calories: 2897, protein: 140, carbs: 444, fat: 62 },
    basisCaption: 'Katch · BF 15% · Moderate',
    locked: false,
  },
} satisfies Meta<typeof TotalsCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Katch: Story = {};
export const BodyweightFallback: Story = {
  args: { basisCaption: 'Bodyweight × 15', onCalculateBodyFat: () => {} },
};
export const Locked: Story = { args: { locked: true } };
