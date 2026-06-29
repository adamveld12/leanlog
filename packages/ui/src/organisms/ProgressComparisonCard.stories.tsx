import type { Meta, StoryObj } from '@storybook/react';
import { ProgressComparisonCard, type ProgressPosePanel } from './ProgressComparisonCard';

const meta: Meta<typeof ProgressComparisonCard> = {
  title: 'Design System/Organisms/ProgressComparisonCard',
  component: ProgressComparisonCard,
};

export default meta;
type Story = StoryObj<typeof ProgressComparisonCard>;

const photo = (label: string) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="%23d4d4d8"/><text x="150" y="160" font-size="28" text-anchor="middle" fill="%2352525b">${label}</text></svg>`,
  );

const comparedFront: ProgressPosePanel = {
  pose: 'front',
  poseLabel: 'Front',
  state: 'compared',
  emptyPrompt: 'Log a front photo to start tracking.',
  headline: { elapsed: '11 weeks', weightDelta: '-8 lb', vTaperDelta: '+0.09' },
  baseline: {
    src: photo('Baseline'),
    alt: 'Front baseline',
    caption: 'Baseline · Apr 9',
    weight: '207 lb',
    vTaper: '1.52',
  },
  latest: {
    src: photo('Latest'),
    alt: 'Front latest',
    caption: 'Latest · Jun 25',
    weight: '199 lb',
    vTaper: '1.61',
  },
  baselineOptions: [
    { value: '2026-04-09', label: 'Apr 9' },
    { value: '2026-05-21', label: 'May 21' },
  ],
  selectedBaseline: null,
  onPickBaseline: () => {},
};

const singleSide: ProgressPosePanel = {
  pose: 'side',
  poseLabel: 'Side',
  state: 'single',
  emptyPrompt: 'Log a side photo to start tracking.',
  latest: {
    src: photo('Side'),
    alt: 'Side latest',
    caption: 'Jun 25',
    weight: '199 lb',
    vTaper: null,
  },
};

const emptyBack: ProgressPosePanel = {
  pose: 'back',
  poseLabel: 'Back',
  state: 'empty',
  emptyPrompt: 'Log a back photo to start tracking.',
};

export const AllStates: Story = {
  args: { panels: [comparedFront, singleSide, emptyBack] },
};
