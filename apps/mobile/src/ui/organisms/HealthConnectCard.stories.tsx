import type { Meta, StoryObj } from '@storybook/react-native';
import { HealthConnectCard } from './HealthConnectCard';

const meta = {
  title: 'Design System/Organisms/HealthConnectCard',
  component: HealthConnectCard,
  args: {
    status: 'available',
    connected: false,
    pending: 0,
    onConnect: () => {},
    onStop: () => {},
    onManage: () => {},
    onGetHealthConnect: () => {},
    onWhy: () => {},
  },
} satisfies Meta<typeof HealthConnectCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const NotConnected: Story = {};
export const Connected: Story = { args: { connected: true } };
export const ConnectedWithPending: Story = { args: { connected: true, pending: 3 } };
export const Unavailable: Story = { args: { status: 'unavailable' } };
export const UpdateRequired: Story = { args: { status: 'update_required' } };
export const Checking: Story = { args: { status: null } };
