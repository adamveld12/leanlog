import type { Meta, StoryObj } from '@storybook/react-native';
import { HealthRationaleCard } from './HealthRationaleCard';

const meta = {
  title: 'Design System/Organisms/HealthRationaleCard',
  component: HealthRationaleCard,
} satisfies Meta<typeof HealthRationaleCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
