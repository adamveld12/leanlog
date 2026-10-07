import type { Meta, StoryObj } from '@storybook/react-native';
import { Card } from './Card';
import { Screen } from './Screen';
import { Text } from './Text';

const meta = {
  title: 'Design System/Atoms/Screen',
  component: Screen,
  args: { children: null },
} satisfies Meta<typeof Screen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <>
        <Card title="One">
          <Text>First card</Text>
        </Card>
        <Card title="Two">
          <Text>Second card</Text>
        </Card>
      </>
    ),
  },
};
