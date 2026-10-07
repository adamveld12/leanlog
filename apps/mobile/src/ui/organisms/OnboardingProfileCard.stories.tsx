import type { Meta, StoryObj } from '@storybook/react-native';
import { OnboardingProfileCard } from './OnboardingProfileCard';

const meta = {
  title: 'Design System/Organisms/OnboardingProfileCard',
  component: OnboardingProfileCard,
  args: { todayIso: '2026-10-06', onNext: () => {} },
} satisfies Meta<typeof OnboardingProfileCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
