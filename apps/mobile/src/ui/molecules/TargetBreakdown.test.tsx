import { render, screen } from '@testing-library/react-native';
import { TargetBreakdown } from './TargetBreakdown';

describe('TargetBreakdown', () => {
  it('walks LBM → BMR → + activity → ± delta → target (Moderate, −300)', async () => {
    await render(
      <TargetBreakdown
        basis="katch"
        breakdown={{ lbmKg: 69.396, bmr: 1869.05, activityKcal: 1027.98 }}
        calorieDelta={-300}
        targetCalories={2597}
      />,
    );
    expect(screen.getByText('LBM 69.4 kg → BMR 1,869')).toBeTruthy();
    expect(screen.getByText('+ activity 1,028 → −300')).toBeTruthy();
    expect(screen.getByText('= 2,597 kcal')).toBeTruthy();
  });

  it('explains the bodyweight fallback when there is no body fat yet', async () => {
    await render(
      <TargetBreakdown
        basis="bodyweight"
        breakdown={null}
        calorieDelta={0}
        targetCalories={2700}
      />,
    );
    expect(screen.getByText('Bodyweight × 15 = 2,700 kcal')).toBeTruthy();
  });
});
