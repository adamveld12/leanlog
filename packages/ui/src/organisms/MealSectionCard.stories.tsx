import type { Meta, StoryObj } from '@storybook/react';
import { MealSectionCard } from './MealSectionCard';

const meta: Meta<typeof MealSectionCard> = {
  title: 'Design System/Organisms/MealSectionCard',
  component: MealSectionCard,
  args: {
    title: 'Breakfast',
    items: [
      { id: '1', name: 'EGGS', calories: 140, protein: 12, carbs: 1, fat: 10, editable: true },
      { id: '2', name: 'OATS', calories: 280, protein: 10, carbs: 50, fat: 5, editable: true },
    ],
    totals: { calories: 420, protein: 22, carbs: 51, fat: 15 },
    onAdd: () => {},
    onEdit: () => {},
    onDelete: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof MealSectionCard>;

export const Default: Story = {};

export const Empty: Story = {
  args: { title: 'Lunch', items: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
};

// Extras from full mode appear under Snacks but can't be changed here.
export const WithReadOnlyItem: Story = {
  args: {
    title: 'Snacks',
    items: [
      { id: '3', name: 'CHIPS', calories: 150, protein: 2, carbs: 15, fat: 9, editable: false },
    ],
    totals: { calories: 150, protein: 2, carbs: 15, fat: 9 },
  },
};

export const ReadOnly: Story = {
  args: { readOnly: true },
};

// Opening the section failed (e.g. the server refused to create its meal).
export const WithError: Story = {
  args: { title: 'Lunch', items: [], error: "Couldn't open Lunch. Try again." },
};

// Inline add (#102): the card grows in place to hold the app's entry form.
export const Expanded: Story = {
  args: {
    title: 'Lunch',
    items: [],
    totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    expanded: true,
    entry: 'Database · Label Scan · Manual entry form goes here',
  },
};
