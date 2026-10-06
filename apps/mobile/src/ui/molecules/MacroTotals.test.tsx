import { render, screen } from '@testing-library/react-native';
import { MacroTotals } from './MacroTotals';

const consumed = { calories: 1240, protein: 88, carbs: 120, fat: 41 };

describe('MacroTotals', () => {
  it('shows calories and P / C / F against the targets', async () => {
    await render(
      <MacroTotals
        consumed={consumed}
        targets={{ calories: 2897, protein: 140, carbs: 444, fat: 62 }}
      />,
    );
    expect(screen.getByText('1,240 / 2,897 kcal')).toBeTruthy();
    expect(screen.getByText('P 88/140 · C 120/444 · F 41/62')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Calories' }).props.accessibilityValue).toEqual({
      min: 0,
      max: 2897,
      now: 1240,
    });
  });

  it('shows totals only when a day has no targets', async () => {
    await render(<MacroTotals consumed={consumed} targets={null} />);
    expect(screen.getByText('1,240 kcal')).toBeTruthy();
    expect(screen.getByText('P 88 · C 120 · F 41')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});
