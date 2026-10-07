import type { Meta, StoryObj } from '@storybook/react-native';
import { MeasurementHistoryCard } from './MeasurementHistoryCard';

const waist = [
  { date: '2026-09-25', value: 33.5 },
  { date: '2026-09-29', value: 33 },
  { date: '2026-10-03', value: 32.5 },
];

const meta = {
  title: 'Design System/Organisms/MeasurementHistoryCard',
  component: MeasurementHistoryCard,
  args: {
    unit: 'in',
    series: {
      shoulderIn: [],
      waistIn: waist,
      bicepIn: [],
      thighIn: [],
      neckIn: [],
      hipIn: [],
    },
  },
} satisfies Meta<typeof MeasurementHistoryCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
