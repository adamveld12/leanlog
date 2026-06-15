import type { Meta, StoryObj } from '@storybook/react';
import { IngredientList, type IngredientListItem } from './IngredientList';

const sample: IngredientListItem[] = [
  {
    id: '1',
    name: 'Chicken breast',
    weight: 150,
    calories: 248,
    protein: 46,
    carbs: 0,
    fat: 5,
    sourceDatabaseIngredientId: null,
  },
  {
    id: '2',
    name: 'Jasmine rice',
    weight: 200,
    calories: 260,
    protein: 5,
    carbs: 57,
    fat: 1,
    sourceDatabaseIngredientId: 'db-42',
  },
];

const meta: Meta<typeof IngredientList> = {
  title: 'Design System/Organisms/IngredientList',
  component: IngredientList,
  args: {
    ingredients: sample,
    onEdit: () => {},
    onDelete: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof IngredientList>;

export const Default: Story = {};

export const Empty: Story = {
  args: { ingredients: [] },
};

export const WithSaveToDatabase: Story = {
  args: { onSaveToDatabase: () => {} },
};

export const Saving: Story = {
  args: { onSaveToDatabase: () => {}, savingToDbId: '1' },
};
