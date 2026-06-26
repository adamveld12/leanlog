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
  it('renders the combined "Measurements" card with both sub-sections', () => {
    renderCard();
    expect(screen.getByText('Measurements')).toBeInTheDocument();
    expect(screen.getByText('Weight · daily')).toBeInTheDocument();
    expect(screen.getByText('Measurements · weekly')).toBeInTheDocument();
  });

  it('collapses weight to a summary once logged today; Edit re-expands it', () => {
    renderCard({ weightLbs: 182, latestMeasurements: LATEST });
    expect(screen.getByText('182 lbs')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('e.g. 180')).not.toBeInTheDocument();
    // First Collapsible is weight; click its Edit to expand.
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    expect(screen.getByPlaceholderText('e.g. 180')).toBeInTheDocument();
  });

  it('prompts (expanded) for weight when not logged today', () => {
    renderCard({ weightLbs: null });
    expect(screen.getByPlaceholderText('e.g. 180')).toBeInTheDocument();
  });

  it('weekly measurements summary uses the most-recent values, not today nulls', () => {
    renderCard({ weightLbs: 182, measurementsToday: NO_TODAY, latestMeasurements: LATEST });
    expect(screen.getByText(/Last measured/)).toBeInTheDocument();
    expect(screen.getByText('1.56')).toBeInTheDocument();
    // The four-site editor is collapsed (today is blank), so no shoulder input shows.
    expect(screen.queryByPlaceholderText('e.g. 50')).not.toBeInTheDocument();
  });

  it('hard-blocks overdue measurements: required banner, no toggle, Save gated on all four', () => {
    renderCard({ weightLbs: 182, measurementsDue: true, measurementsToday: NO_TODAY });
    expect(screen.getByText(/Required — log all four/)).toBeInTheDocument();
    // Measurements section is locked → it has no Edit/Collapse toggle of its own.
    expect(screen.queryByRole('button', { name: 'Collapse' })).not.toBeInTheDocument();
    // Save disabled until all four are present.
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('overdue Save enables and emits all four when the set is complete; shows live v-taper', () => {
    const onSaveMeasurements = vi.fn();
    renderCard({
      weightLbs: 182,
      measurementsDue: true,
      measurementsToday: { shoulderInches: 50, waistInches: 32, bicepInches: 15, thighInches: 23 },
      onSaveMeasurements,
    });
    expect(screen.getByText('1.56')).toBeInTheDocument(); // live v-taper from 50/32
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

  it('saves weight via onSaveWeight when a new value is entered', () => {
    const onSaveWeight = vi.fn();
    renderCard({ weightLbs: null, onSaveWeight });
    fireEvent.change(screen.getByPlaceholderText('e.g. 180'), { target: { value: '180' } });
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    expect(onSaveWeight).toHaveBeenCalledWith(180);
  });
});
