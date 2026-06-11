import type { Meta, StoryObj } from '@storybook/react';
import { HelperText } from '../atoms/HelperText';
import { SectionHeading } from '../atoms/SectionHeading';
import { SectionCard } from '../molecules/SectionCard';
import { Tabs } from '../molecules/Tabs';
import { IngredientEntryCard } from '../organisms/IngredientEntryCard';
import { LabelScanCard } from '../organisms/LabelScanCard';
import { recipes } from '../styles/recipes';
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
  sugarAlcohol: null,
  allulose: null,
  alcohol: null,
};

const heading = {
  title: 'LUNCH',
  profileHref: '/profile',
  renderNavLink: ({
    href,
    label,
    className,
  }: {
    href: string;
    label: string;
    className: string;
  }) => (
    <a className={className} href={href}>
      {label}
    </a>
  ),
};
const mealSection = (
  <SectionCard>
    <SectionHeading>LUNCH</SectionHeading>
    <HelperText as="p">CHICKEN · 220 kcal</HelperText>
  </SectionCard>
);

const meta: Meta<typeof MealEditTemplate> = {
  title: 'Design System/Templates/MealEditTemplate',
  component: MealEditTemplate,
  args: {
    heading,
    mealSection,
    ingredientSection: (
      <IngredientEntryCard
        value={value}
        estimatedCalories={220}
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

export const WithTabs: Story = {
  args: {
    ingredientSection: (
      <div className={recipes.stack.lg}>
        <Tabs
          tabs={[
            { key: 'manual', label: 'Manual Entry', panelId: 'story-ingredient-manual-panel' },
            { key: 'scan', label: 'Label Scan', panelId: 'story-ingredient-scan-panel' },
            {
              key: 'database',
              label: 'Nutrition Database',
              panelId: 'story-ingredient-database-panel',
            },
          ]}
          active="scan"
          onChange={() => undefined}
          label="Ingredient entry method"
        />
        <div
          role="tabpanel"
          id="story-ingredient-scan-panel"
          aria-labelledby="story-ingredient-scan-panel-tab"
        >
          <LabelScanCard
            value={{ mode: 'weight', amount: 0 }}
            onChange={() => undefined}
            onScan={() => undefined}
          />
        </div>
      </div>
    ),
  },
};
