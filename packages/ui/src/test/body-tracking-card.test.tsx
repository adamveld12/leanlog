import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BodyTrackingCard } from '../organisms/BodyTrackingCard';

const NO_TODAY = { shoulderInches: null, waistInches: null, bicepInches: null, thighInches: null };
const LATEST = {
  shoulderInches: 50,
  waistInches: 32,
  bicepInches: 15.5,
  thighInches: 23,
  vTaper: 1.56,
  date: '2026-06-22',
};

function renderCard(overrides: Partial<React.ComponentProps<typeof BodyTrackingCard>> = {}) {
  return render(
    <BodyTrackingCard
      weightLbs={null}
      onSaveWeight={vi.fn()}
      measurementsToday={NO_TODAY}
      latestMeasurements={null}
      measurementsDue={false}
      onSaveMeasurements={vi.fn()}
      {...overrides}
    />,
  );
}

describe('BodyTrackingCard (#68)', () => {
  it('renders the combined "Measurements" card', () => {
    renderCard({ weightLbs: 182, latestMeasurements: LATEST });
    expect(screen.getByText('Measurements')).toBeInTheDocument();
  });

  it('auto-collapses weight to a summary once logged — no editor, no toggle', () => {
    renderCard({ weightLbs: 182, latestMeasurements: LATEST });
    expect(screen.getByText('182 lbs')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('e.g. 180')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit|collapse/i })).not.toBeInTheDocument();
  });

  it('hard-blocks weight when not logged: required prompt + editor shown', () => {
    renderCard({ weightLbs: null, latestMeasurements: LATEST });
    expect(screen.getByText(/Required — log today’s weight/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. 180')).toBeInTheDocument();
  });

  it('auto-collapses measurements to the most-recent summary when not due', () => {
    renderCard({ weightLbs: 182, measurementsToday: NO_TODAY, latestMeasurements: LATEST });
    expect(screen.getByText(/Last measured/)).toBeInTheDocument();
    expect(screen.getByText('1.56')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('e.g. 50')).not.toBeInTheDocument();
  });

  it('hard-blocks overdue measurements: required-all-four prompt, no toggle, Save gated', () => {
    renderCard({ weightLbs: 182, measurementsDue: true, measurementsToday: NO_TODAY });
    expect(screen.getByText(/Required — log all four/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit|collapse/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('overdue Save enables with a complete set and emits all four; shows live v-taper', () => {
    const onSaveMeasurements = vi.fn();
    renderCard({
      weightLbs: 182,
      measurementsDue: true,
      measurementsToday: { shoulderInches: 50, waistInches: 32, bicepInches: 15, thighInches: 23 },
      onSaveMeasurements,
    });
    expect(screen.getByText('1.56')).toBeInTheDocument();
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    expect(onSaveMeasurements).toHaveBeenCalledWith({
      shoulderInches: 50,
      waistInches: 32,
      bicepInches: 15,
      thighInches: 23,
    });
  });

  it('saves weight via onSaveWeight when a value is entered', () => {
    const onSaveWeight = vi.fn();
    renderCard({
      weightLbs: null,
      measurementsDue: false,
      latestMeasurements: LATEST,
      onSaveWeight,
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. 180'), { target: { value: '180' } });
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    expect(onSaveWeight).toHaveBeenCalledWith(180);
  });
});
