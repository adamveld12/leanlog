import type { Meta, StoryObj } from '@storybook/react-native';
import { OnboardingHealthConnectCard } from './OnboardingHealthConnectCard';

const meta = {
  title: 'Design System/Organisms/OnboardingHealthConnectCard',
  component: OnboardingHealthConnectCard,
  args: { onConnect: () => {}, onSkip: () => {} },
} satisfies Meta<typeof OnboardingHealthConnectCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
