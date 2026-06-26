import type { Meta, StoryObj } from '@storybook/react';
import { BodyTrackingCard } from './BodyTrackingCard';

const NO_TODAY = { shoulderInches: null, waistInches: null, bicepInches: null, thighInches: null };
const LATEST = {
  shoulderInches: 50,
  waistInches: 32,
  bicepInches: 15.5,
  thighInches: 23,
  vTaper: 1.56,
  date: '2026-06-22',
};
const noop = () => {};
const base = {
  onSaveWeight: noop,
  onSaveMeasurements: noop,
  measurementsToday: NO_TODAY,
};

const meta: Meta<typeof BodyTrackingCard> = {
  title: 'Design System/Organisms/BodyTrackingCard',
  component: BodyTrackingCard,
};

export default meta;
type Story = StoryObj<typeof BodyTrackingCard>;

// Brand-new user: weight prompt expanded, measurements overdue → hard block.
export const NewUserOverdue: Story = {
  args: { ...base, weightLbs: null, latestMeasurements: null, measurementsDue: true },
};

// Mid-week: weight not yet logged today (prompt), measurements current (collapsed summary).
export const WeightPromptMeasurementsCurrent: Story = {
  args: { ...base, weightLbs: null, latestMeasurements: LATEST, measurementsDue: false },
};

// Everything satisfied: both collapsed to summaries, each with an Edit button.
export const AllLoggedEditable: Story = {
  args: { ...base, weightLbs: 182, latestMeasurements: LATEST, measurementsDue: false },
};

// Past day: values shown read-only, no Edit, no inputs.
export const ReadOnlyPastDay: Story = {
  args: {
    ...base,
    weightLbs: 181,
    latestMeasurements: LATEST,
    measurementsDue: false,
    readOnly: true,
  },
};

// Weight logged, but measurements overdue → measurements force-expanded, all four required.
export const MeasurementsOverdue: Story = {
  args: { ...base, weightLbs: 182, latestMeasurements: LATEST, measurementsDue: true },
};

export const SavingMeasurements: Story = {
  args: {
    ...base,
    weightLbs: 182,
    latestMeasurements: LATEST,
    measurementsDue: true,
    savingMeasurements: true,
  },
};
