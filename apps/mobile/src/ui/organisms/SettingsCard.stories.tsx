import type { Meta, StoryObj } from '@storybook/react-native';
import { SettingsCard } from './SettingsCard';

const meta = {
  title: 'Design System/Organisms/SettingsCard',
  component: SettingsCard,
  args: { units: 'imperial', onChangeUnits: () => {} },
} satisfies Meta<typeof SettingsCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Imperial: Story = {};
export const Metric: Story = { args: { units: 'metric' } };
export const WithAnalytics: Story = {
  args: { analytics: { enabled: false, onChange: () => {} } },
};
