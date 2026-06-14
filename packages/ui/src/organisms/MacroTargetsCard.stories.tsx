import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { MacroTargetsCard, type MacroMode } from './MacroTargetsCard';

function MacroTargetsDemo() {
  const [mode, setMode] = useState<MacroMode>('percentage');
  const [fats, setFats] = useState<number | null>(30);
  const [carbs, setCarbs] = useState<number | null>(40);
  const [protein, setProtein] = useState<number | null>(30);
  return (
    <MacroTargetsCard
      saved
      mode={mode}
      fats={fats}
      carbs={carbs}
      protein={protein}
      fatsHint={mode === 'percentage' ? '90g' : '30% total'}
      carbsHint={mode === 'percentage' ? '270g' : '40% total'}
      proteinHint={mode === 'percentage' ? '203g' : '30% total'}
      error=""
      onModeChange={setMode}
      onFatsChange={setFats}
      onCarbsChange={setCarbs}
      onProteinChange={setProtein}
      onBlur={() => undefined}
    />
  );
}

const meta: Meta<typeof MacroTargetsCard> = {
  title: 'Design System/Organisms/MacroTargetsCard',
  component: MacroTargetsCard,
};

export default meta;
type Story = StoryObj<typeof MacroTargetsCard>;

export const Default: Story = { render: () => <MacroTargetsDemo /> };
