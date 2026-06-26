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

  it('weight: logged → summary + Edit; Edit opens the editor; Cancel returns to summary', () => {
    // measurementsDue makes the measurements section a hard block (no Edit there),
    // so the only Edit button is weight's.
    renderCard({ weightLbs: 182, measurementsDue: true });
    expect(screen.getByText('182 lbs')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('e.g. 180')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByPlaceholderText('e.g. 180')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByPlaceholderText('e.g. 180')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('weight: not logged is a hard block — required prompt, editor, no Edit/Cancel', () => {
    renderCard({ weightLbs: null, measurementsDue: true, latestMeasurements: null });
    expect(screen.getByText(/Required — log today’s weight/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. 180')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSaveWeight).toHaveBeenCalledWith(180);
  });

  it('measurements: Edit seeds the standing set, shows live v-taper, Cancel returns', () => {
    // weightLbs null → weight is a hard block (no weight Edit), so the only Edit is measurements'.
    renderCard({ weightLbs: null, measurementsDue: false, latestMeasurements: LATEST });
    expect(screen.getByText(/Last measured/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('e.g. 50')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const shoulder = screen.getByPlaceholderText('e.g. 50') as HTMLInputElement;
    expect(shoulder.value).toBe('50'); // seeded from the standing set
    expect(screen.getByText('1.56')).toBeInTheDocument(); // live v-taper from 50/32
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByPlaceholderText('e.g. 50')).not.toBeInTheDocument();
  });

  it('measurements: overdue is a hard block — required-all-four, Save gated, no Edit/Cancel', () => {
    renderCard({ weightLbs: 182, measurementsDue: true, measurementsToday: NO_TODAY });
    expect(screen.getByText(/Required — log all four/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('measurements: overdue Save emits all four when complete', () => {
    const onSaveMeasurements = vi.fn();
    renderCard({
      weightLbs: 182,
      measurementsDue: true,
      measurementsToday: { shoulderInches: 50, waistInches: 32, bicepInches: 15, thighInches: 23 },
      onSaveMeasurements,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSaveMeasurements).toHaveBeenCalledWith({
      shoulderInches: 50,
      waistInches: 32,
      bicepInches: 15,
      thighInches: 23,
    });
  });

  it('readOnly: shows values with no Edit buttons and no inputs', () => {
    renderCard({ weightLbs: 181, latestMeasurements: LATEST, readOnly: true });
    expect(screen.getByText('181 lbs')).toBeInTheDocument();
    expect(screen.getByText('1.56')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('e.g. 180')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('e.g. 50')).not.toBeInTheDocument();
  });

  it('readOnly with no data shows the empty placeholders, still no editing', () => {
    renderCard({ weightLbs: null, latestMeasurements: null, readOnly: true });
    expect(screen.getByText('No weight logged')).toBeInTheDocument();
    expect(screen.getByText('No measurements logged')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
