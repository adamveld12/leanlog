import type { Meta, StoryObj } from '@storybook/react';
import { MacroSummaryLine } from './MacroSummaryLine';

const meta: Meta<typeof MacroSummaryLine> = {
  title: 'Components/MacroSummaryLine',
  component: MacroSummaryLine,
};

export default meta;
type Story = StoryObj<typeof MacroSummaryLine>;

export const Plain: Story = {
  args: { calories: 520, protein: 31, carbs: 42, fat: 20 },
};

export const TargetOnTrack: Story = {
  args: { calories: 520, calorieTarget: 530, protein: 31, carbs: 42, fat: 20 },
};

export const TargetNear: Story = {
  args: { calories: 520, calorieTarget: 600, protein: 31, carbs: 42, fat: 20 },
};

export const TargetOff: Story = {
  args: { calories: 520, calorieTarget: 700, protein: 31, carbs: 42, fat: 20 },
};
