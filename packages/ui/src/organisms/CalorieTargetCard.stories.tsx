import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { CalorieTargetCard, type CalorieMode } from './CalorieTargetCard';

function CalorieTargetDemo() {
  const [mode, setMode] = useState<CalorieMode>('maintenance');
  const [target, setTarget] = useState(2700);
  return (
    <CalorieTargetCard
      saved
      mode={mode}
      targetCaloriesText={String(target)}
      canEditTargetCalories={mode === 'custom'}
      targetCaloriesError=""
      onModeChange={setMode}
      onTargetCaloriesChange={setTarget}
      onTargetCaloriesBlur={() => undefined}
    />
  );
}

const meta: Meta<typeof CalorieTargetCard> = {
  title: 'Design System/Organisms/CalorieTargetCard',
  component: CalorieTargetCard,
};

export default meta;
type Story = StoryObj<typeof CalorieTargetCard>;

export const Default: Story = { render: () => <CalorieTargetDemo /> };
