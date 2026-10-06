import type { Meta, StoryObj } from '@storybook/react-native';
import { BodyFatCalculatorCard } from './BodyFatCalculatorCard';

const meta = {
  title: 'Design System/Organisms/BodyFatCalculatorCard',
  component: BodyFatCalculatorCard,
  args: {
    todayIso: '2026-10-06',
    profile: { sex: 'male', heightIn: 72, birthDate: '1991-01-01' },
    measurements: { neckIn: 15, waistIn: 34, hipIn: null },
    targetContext: {
      weightLbs: 180,
      activityLevel: 'moderate',
      calorieDelta: 0,
      macroFats: 30,
      macroCarbs: 40,
      macroProtein: 30,
    },
    onSave: () => {},
  },
} satisfies Meta<typeof BodyFatCalculatorCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Navy: Story = {};
export const Female: Story = {
  args: {
    profile: { sex: 'female', heightIn: 65, birthDate: '1996-03-01' },
    measurements: { neckIn: 13, waistIn: 30, hipIn: 40 },
  },
};
