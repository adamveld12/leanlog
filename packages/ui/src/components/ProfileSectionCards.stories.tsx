import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { BodyInfoCard, CalorieTargetCard, MacroTargetsCard } from './ProfileSectionCards';

function BodyInfoDemo() {
  const [weight, setWeight] = useState(180);
  const [height, setHeight] = useState(70);
  return (
    <BodyInfoCard
      saved
      weightLbs={weight}
      heightInches={height}
      weightError=""
      onWeightChange={setWeight}
      onHeightChange={setHeight}
      onWeightBlur={() => undefined}
      onHeightBlur={() => undefined}
    />
  );
}

function CalorieTargetDemo() {
  const [mode, setMode] = useState<'deficit' | 'maintenance' | 'surplus' | 'custom'>('maintenance');
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

function MacroTargetsDemo() {
  const [mode, setMode] = useState<'percentage' | 'custom'>('percentage');
  const [fats, setFats] = useState(30);
  const [carbs, setCarbs] = useState(40);
  const [protein, setProtein] = useState(30);
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

const meta: Meta = {
  title: 'Composed/Profile Section Cards',
};

export default meta;
type Story = StoryObj;

export const BodyInfo: Story = { render: () => <BodyInfoDemo /> };
export const CalorieTarget: Story = { render: () => <CalorieTargetDemo /> };
export const MacroTargets: Story = { render: () => <MacroTargetsDemo /> };
