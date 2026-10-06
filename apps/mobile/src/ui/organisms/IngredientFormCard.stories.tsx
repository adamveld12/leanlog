import type { Meta, StoryObj } from '@storybook/react-native';
import { IngredientFormCard } from './IngredientFormCard';

const meta = {
  title: 'Design System/Organisms/IngredientFormCard',
  component: IngredientFormCard,
  args: { onSubmit: () => {} },
} satisfies Meta<typeof IngredientFormCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
