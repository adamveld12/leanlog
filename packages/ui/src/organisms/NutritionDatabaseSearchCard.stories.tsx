import type { Meta, StoryObj } from '@storybook/react';
import { NutritionDatabaseSearchCard } from './NutritionDatabaseSearchCard';

const baseResults = [
  {
    id: 'ing-1',
    name: 'CHICKEN BREAST',
    servingAmount: 100,
    fat: 3.6,
    carbs: 0,
    protein: 31,
    fiber: null,
    calories: 165,
    addedByName: 'Adam',
    addedAtLabel: 'Jun 1, 2026',
    creationSource: 'manual',
  },
  {
    id: 'ing-2',
    name: 'BROWN RICE',
    servingAmount: 100,
    fat: 0.9,
    carbs: 23,
    protein: 2.6,
    fiber: 1.8,
    calories: 110,
    addedByName: 'System',
    addedAtLabel: 'May 15, 2026',
    creationSource: 'scan',
  },
];

const meta: Meta<typeof NutritionDatabaseSearchCard> = {
  title: 'Design System/Organisms/NutritionDatabaseSearchCard',
  component: NutritionDatabaseSearchCard,
  args: {
    query: 'chicken',
    onQueryChange: () => {},
    results: baseResults,
    loading: false,
    searched: true,
    amounts: {},
    onAmountChange: () => {},
    onAdd: () => {},
    addingId: null,
    onCreateNew: () => {},
    onScanLabel: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof NutritionDatabaseSearchCard>;

export const Default: Story = {};

export const Loading: Story = {
  args: {
    loading: true,
    results: [],
    searched: false,
  },
};

export const NoResults: Story = {
  args: {
    results: [],
    searched: true,
    query: 'xyz unknown',
  },
};

export const Duplicates: Story = {
  args: {
    results: [{ ...baseResults[0] }, { ...baseResults[0] }],
    amounts: { 'ing-1': 150 },
  },
};

export const WithAmount: Story = {
  args: {
    amounts: { 'ing-1': 150 },
  },
};

export const Adding: Story = {
  args: {
    amounts: { 'ing-1': 150 },
    addingId: 'ing-1',
  },
};

export const Truncated: Story = {
  args: {
    truncated: true,
  },
};

export const NoCreateNew: Story = {
  args: {
    onCreateNew: undefined,
    onScanLabel: undefined,
  },
};

export const Scanning: Story = {
  args: {
    scanning: true,
  },
};

export const WithTotalCount: Story = {
  args: {
    totalCount: 128,
  },
};

// R10: entries with a photo show a thumbnail; entries without show the neutral
// placeholder. Uses a data URI so the story is self-contained.
const SAMPLE_THUMB =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="%23c9714a"/></svg>',
  );

export const WithThumbnails: Story = {
  args: {
    results: [
      { ...baseResults[0], thumbnailUrl: SAMPLE_THUMB },
      { ...baseResults[1], thumbnailUrl: null },
    ],
  },
};

// R11: a row with photos offers a "View photos" toggle that reveals both
// photos at a readable size (read-only — no creator controls).
export const WithPhotoExpand: Story = {
  args: {
    results: [
      {
        ...baseResults[0],
        thumbnailUrl: SAMPLE_THUMB,
        productPhotoUrl: SAMPLE_THUMB,
        labelPhotoUrl: SAMPLE_THUMB,
      },
    ],
  },
};

// Management page (#49): rows show Edit/Delete instead of the add controls, and
// only for labels the current user owns (here, ing-1).
export const ManageMode: Story = {
  args: {
    onAdd: undefined,
    onAmountChange: undefined,
    onEdit: () => {},
    onDelete: () => {},
    canManage: (id: string) => id === 'ing-1',
    totalCount: 128,
  },
};

export const ManageModeDeleting: Story = {
  args: {
    onAdd: undefined,
    onAmountChange: undefined,
    onEdit: () => {},
    onDelete: () => {},
    canManage: () => true,
    deletingId: 'ing-1',
  },
};

export const ManageModeWithLoadMore: Story = {
  args: {
    query: '',
    onAdd: undefined,
    onAmountChange: undefined,
    onEdit: () => {},
    onDelete: () => {},
    canManage: () => true,
    onLoadMore: () => {},
    totalCount: 128,
  },
};
