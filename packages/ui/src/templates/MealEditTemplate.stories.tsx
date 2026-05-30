import type { Meta, StoryObj } from '@storybook/react';
import { HelperText } from '../atoms/HelperText';
import { SectionHeading } from '../atoms/SectionHeading';
import { SectionCard } from '../molecules/SectionCard';
import { IngredientEntryCard } from '../organisms/IngredientEntryCard';
import { MealEditTemplate } from './MealEditTemplate';

const value = {
  name: 'CHICKEN',
  weight: 100,
  calories: 220,
  fat: 6,
  saturatedFat: 1,
  carbs: 0,
  fiber: 0,
  protein: 42,
};

const meta: Meta<typeof MealEditTemplate> = {
  title: 'Design System/Templates/MealEditTemplate',
  component: MealEditTemplate,
  args: {
    heading: { title: 'LUNCH', profileHref: '/profile' },
    mealSection: (
      <SectionCard>
        <SectionHeading>LUNCH</SectionHeading>
        <HelperText as="p">CHICKEN · 220 kcal</HelperText>
      </SectionCard>
    ),
    ingredientSection: (
      <IngredientEntryCard
        value={value}
        submitLabel="Add"
        onChange={() => undefined}
        onSubmit={() => undefined}
      />
    ),
  },
};
export default meta;
type Story = StoryObj<typeof MealEditTemplate>;
export const Default: Story = {};
