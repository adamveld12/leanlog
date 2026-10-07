import type { Meta, StoryObj } from '@storybook/react-native';
import { TargetsCard } from './TargetsCard';

const initial = {
  activityLevel: 'moderate' as const,
  calorieDelta: -300,
  macroFats: 30,
  macroCarbs: 40,
  macroProtein: 30,
};

const meta = {
  title: 'Design System/Organisms/TargetsCard',
  component: TargetsCard,
  args: { initial, weightLbs: 180, bodyFatPct: 15, onSave: () => {} },
} satisfies Meta<typeof TargetsCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Katch: Story = {};
export const BodyweightFallback: Story = {
  args: { bodyFatPct: null, initial: { ...initial, activityLevel: null, calorieDelta: 0 } },
};
export const BelowFloor: Story = { args: { initial: { ...initial, calorieDelta: -1800 } } };
