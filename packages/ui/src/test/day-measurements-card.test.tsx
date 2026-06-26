import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DayMeasurementsCard } from '../organisms/DayMeasurementsCard';

function noop() {}

function renderCard(overrides: Partial<React.ComponentProps<typeof DayMeasurementsCard>> = {}) {
  return render(
    <DayMeasurementsCard
      shoulderInches={null}
      waistInches={null}
      bicepInches={null}
      thighInches={null}
      onSave={noop}
      {...overrides}
    />,
  );
}

describe('DayMeasurementsCard (#68)', () => {
  it('renders the four sites with right-side hints on bicep and thigh (R1/R4)', () => {
    renderCard();
    expect(screen.getByText('Shoulder (in)')).toBeInTheDocument();
    expect(screen.getByText('Waist (in)')).toBeInTheDocument();
    expect(screen.getByText('Bicep · right (in)')).toBeInTheDocument();
    expect(screen.getByText('Thigh · right (in)')).toBeInTheDocument();
    expect(screen.getAllByText(/Measure your right side/i)).toHaveLength(2);
  });

  it('shows today v-taper of 1.56 for shoulder 50 / waist 32 (BDD)', () => {
    renderCard({ shoulderInches: 50, waistInches: 32 });
    expect(screen.getByText('1.56')).toBeInTheDocument();
  });

  it('prompts to log shoulder and waist when the ratio is not computable (R6)', () => {
    renderCard({ waistInches: 33 });
    expect(screen.getByText(/Log shoulder and waist to see/i)).toBeInTheDocument();
  });
});
