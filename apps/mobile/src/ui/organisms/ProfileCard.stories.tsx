import type { Meta, StoryObj } from '@storybook/react-native';
import { ProfileCard } from './ProfileCard';

const meta = {
  title: 'Design System/Organisms/ProfileCard',
  component: ProfileCard,
  args: {
    initial: { sex: 'male', heightIn: 72, birthDate: '1991-01-01' },
    onSave: () => {},
  },
} satisfies Meta<typeof ProfileCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { initial: { sex: null, heightIn: null, birthDate: null } } };
