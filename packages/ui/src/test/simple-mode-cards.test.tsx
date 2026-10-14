import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BodyTrackingCard } from '../organisms/BodyTrackingCard';
import { DailyTotalsCard } from '../organisms/DailyTotalsCard';

const noMeasurements = {
  shoulderInches: null,
  waistInches: null,
  bicepInches: null,
  thighInches: null,
};

describe('BodyTrackingCard weight-only variant (#102)', () => {
  it('shows weight entry without measurements or the required nag', () => {
    render(
      <BodyTrackingCard
        variant="weightOnly"
        weightLbs={null}
        onSaveWeight={() => {}}
        measurementsToday={noMeasurements}
        latestMeasurements={null}
        measurementsDue
        onSaveMeasurements={() => {}}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Weight' })).toBeInTheDocument();
    expect(screen.getByLabelText('Weight (lbs)')).toBeInTheDocument();
    expect(screen.queryByLabelText('Shoulder (in)')).not.toBeInTheDocument();
    expect(screen.queryByText(/Required/)).not.toBeInTheDocument();
  });
});

describe('DailyTotalsCard without targets (#102)', () => {
  it('shows plain totals with no target fractions or progress bars', () => {
    render(
      <DailyTotalsCard
        calories={1240}
        adjustedCalories={1240}
        protein={92}
        carbs={110}
        fat={41}
        fiber={0}
      />,
    );
    expect(screen.getByText(/1240/)).toBeInTheDocument();
    expect(screen.getByText(/P 92/)).toBeInTheDocument();
    expect(screen.queryByText(/\//)).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
