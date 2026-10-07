import type { Meta, StoryObj } from '@storybook/react-native';
import { OnboardingBodyFatOfferCard } from './OnboardingBodyFatOfferCard';

const meta = {
  title: 'Design System/Organisms/OnboardingBodyFatOfferCard',
  component: OnboardingBodyFatOfferCard,
  args: { onCalculate: () => {}, onSkip: () => {} },
} satisfies Meta<typeof OnboardingBodyFatOfferCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
