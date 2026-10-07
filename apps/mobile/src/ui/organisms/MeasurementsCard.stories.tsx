import type { Meta, StoryObj } from '@storybook/react-native';
import { MeasurementsCard } from './MeasurementsCard';

const meta = {
  title: 'Design System/Organisms/MeasurementsCard',
  component: MeasurementsCard,
  args: {
    values: {
      shoulderIn: 50,
      waistIn: 32,
      bicepIn: null,
      thighIn: null,
      neckIn: null,
      hipIn: null,
    },
    previous: { waistIn: { value: 33, date: '2026-10-03' } },
    onSave: () => {},
  },
} satisfies Meta<typeof MeasurementsCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
