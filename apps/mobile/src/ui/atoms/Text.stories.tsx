import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { Text } from './Text';

const meta = {
  title: 'Design System/Atoms/Text',
  component: Text,
  args: { children: 'Sample text' },
} satisfies Meta<typeof Text>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <View style={{ gap: 8 }}>
      <Text variant="title">Today</Text>
      <Text variant="heading">Section heading</Text>
      <Text>Body text</Text>
      <Text variant="helper">Helper text</Text>
      <Text variant="warning">Warning text</Text>
      <Text variant="unit">kcal</Text>
    </View>
  ),
};
