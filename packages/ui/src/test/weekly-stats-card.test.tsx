import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WeeklyStatsCard, type StatsData } from '../organisms/WeeklyStatsCard';

const STATS: StatsData = {
  accuracyOverall: 80,
  accuracyCalories: 80,
  accuracyProtein: 80,
  accuracyCarbs: 80,
  accuracyFat: 80,
  coverage: 75,
  mealsTracked: 21,
  mealsExpected: 28,
};

function renderCard(overrides: Partial<React.ComponentProps<typeof WeeklyStatsCard>> = {}) {
  return render(
    <WeeklyStatsCard
      weekly={STATS}
      overall={STATS}
      hasWeeklyData
      hasOverallData
      northStar={null}
      weeklyWeightChangeLbs={null}
      {...overrides}
    />,
  );
}

describe('WeeklyStatsCard north star + measured weekly weight (#68)', () => {
  it('prompts to log shoulder and waist before any v-taper exists (R9)', () => {
    renderCard({ northStar: null });
    expect(screen.getByText(/Log shoulder and waist/i)).toBeInTheDocument();
  });

  it('shows the current v-taper against the 1.6 target with the gap (R7)', () => {
    renderCard({ northStar: { currentVTaper: 1.56, target: 1.6, gapToTarget: 0.04, met: false } });
    expect(screen.getByText('1.56')).toBeInTheDocument();
    expect(screen.getByText(/Target 1\.60/)).toBeInTheDocument();
    expect(screen.getByText(/0\.04 to go/)).toBeInTheDocument();
  });

  it('marks the north star reached when met', () => {
    renderCard({ northStar: { currentVTaper: 1.65, target: 1.6, gapToTarget: 0, met: true } });
    expect(screen.getByText(/reached/i)).toBeInTheDocument();
  });

  it('shows the measured weekly weight change and no certainty (R10/R11)', () => {
    renderCard({ weeklyWeightChangeLbs: -2 });
    expect(screen.getByText('-2.0 lb')).toBeInTheDocument();
    expect(screen.queryByText(/certainty/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Est\. Weight/i)).not.toBeInTheDocument();
  });

  it('shows a needs-more-weigh-ins placeholder when the delta is unavailable (R12)', () => {
    renderCard({ weeklyWeightChangeLbs: null });
    expect(screen.getByText(/Needs more weigh-ins/i)).toBeInTheDocument();
  });
});
