import type { Meta, StoryObj } from '@storybook/react';
import { NutritionDatabaseEntryCard } from './NutritionDatabaseEntryCard';
import { PhotoSlot } from '../molecules/PhotoSlot';
import { Button } from '../atoms/Button';

const base = {
  name: '',
  servingAmount: 0,
  servingSizeUnit: 'gram',
  servingsPerPackage: null,
  calories: null,
  fat: 0,
  carbs: 0,
  protein: 0,
  fiber: null,
  sugar: null,
  saturatedFat: null,
  unsaturatedFat: null,
  monounsaturatedFat: null,
  polyunsaturatedFat: null,
  transFat: null,
  micronutrients: [],
};

const filled = {
  name: 'CHICKEN BREAST',
  servingAmount: 100,
  servingSizeUnit: 'gram',
  servingsPerPackage: 2,
  calories: null,
  fat: 3.6,
  carbs: 0,
  protein: 31,
  fiber: null,
  sugar: null,
  saturatedFat: 1,
  unsaturatedFat: null,
  monounsaturatedFat: null,
  polyunsaturatedFat: null,
  transFat: null,
  micronutrients: [],
};

const meta: Meta<typeof NutritionDatabaseEntryCard> = {
  title: 'Design System/Organisms/NutritionDatabaseEntryCard',
  component: NutritionDatabaseEntryCard,
  args: {
    value: base,
    estimatedCalories: 0,
    onChange: () => {},
    onSubmit: () => {},
    submitting: false,
  },
};

export default meta;
type Story = StoryObj<typeof NutritionDatabaseEntryCard>;

export const Default: Story = {};

export const Filled: Story = {
  args: {
    value: filled,
  },
};

export const Submitting: Story = {
  args: {
    value: filled,
    submitting: true,
  },
};

export const ValidationError: Story = {
  args: {
    value: {
      ...base,
      name: '',
      servingAmount: 0,
    },
  },
};

export const FiberError: Story = {
  args: {
    value: {
      ...filled,
      carbs: 5,
      fiber: 10,
    },
  },
};

export const WithMicronutrients: Story = {
  args: {
    value: {
      ...filled,
      micronutrients: [
        { name: 'Sodium', amount: 60, unit: 'milligram' },
        { name: 'Iron', amount: 2.7, unit: 'milligram' },
      ],
    },
  },
};

export const WithPhotos: Story = {
  args: {
    value: filled,
    photosSlot: (
      <div className="grid grid-cols-2 gap-2">
        <PhotoSlot label="Product photo" actions={<Button size="sm">Add photo</Button>} />
        <PhotoSlot label="Nutrition label" actions={<Button size="sm">Add photo</Button>} />
      </div>
    ),
  },
};
