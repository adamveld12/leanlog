import type { Meta, StoryObj } from '@storybook/react-native';
import { Stat } from './Stat';

const meta = {
  title: 'Design System/Atoms/Stat',
  component: Stat,
  args: { label: 'Weekly change', value: '-0.8', unit: 'lb' },
} satisfies Meta<typeof Stat>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
