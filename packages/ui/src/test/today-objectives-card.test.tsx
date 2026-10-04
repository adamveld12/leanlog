import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  TodayObjectivesCard,
  type TodayObjectivesCardProps,
} from '../organisms/TodayObjectivesCard';

const macro = (actual: number, target: number, complete = false) => ({ actual, target, complete });

function props(overrides: Partial<TodayObjectivesCardProps> = {}): TodayObjectivesCardProps {
  return {
    weight: { complete: false, weightLbs: null, onLogWeight: vi.fn() },
    meals: { complete: false, eaten: 0, target: 4, onNextMeal: vi.fn() },
    macros: {
      complete: false,
      protein: macro(0, 200),
      carbs: macro(0, 250),
      fat: macro(0, 70),
      calories: macro(0, 2400),
    },
    allComplete: false,
    ...overrides,
  };
}

describe('TodayObjectivesCard', () => {
  describe('weight objective', () => {
    it('is incomplete, shows the weigh-in tip, and offers a CTA to log weight', async () => {
      const onLogWeight = vi.fn();
      render(
        <TodayObjectivesCard
          {...props({ weight: { complete: false, weightLbs: null, onLogWeight } })}
        />,
      );

      expect(screen.getByRole('img', { name: 'Weight incomplete' })).toBeInTheDocument();
      const tip = screen.getByText(/immediately upon waking/i);
      expect(tip).toHaveTextContent(/after peeing/i);
      expect(tip).toHaveTextContent(/before eating or drinking/i);
      expect(tip).toHaveTextContent(/ideally naked/i);

      await userEvent.click(screen.getByRole('button', { name: /log today.s weight/i }));
      expect(onLogWeight).toHaveBeenCalledTimes(1);
    });

    it('is complete once logged: shows the value and drops the tip and CTA', () => {
      render(
        <TodayObjectivesCard
          {...props({ weight: { complete: true, weightLbs: 182.5, onLogWeight: vi.fn() } })}
        />,
      );

      expect(screen.getByRole('img', { name: 'Weight completed' })).toBeInTheDocument();
      expect(screen.getByText(/182\.5 lbs/)).toBeInTheDocument();
      expect(screen.queryByText(/immediately upon waking/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /log today.s weight/i })).not.toBeInTheDocument();
    });
  });

  describe('meals objective', () => {
    it('shows progress toward the target meal count', () => {
      render(
        <TodayObjectivesCard
          {...props({ meals: { complete: false, eaten: 2, target: 4, onNextMeal: vi.fn() } })}
        />,
      );

      expect(screen.getByText(/2 \/ 4/)).toBeInTheDocument();
      expect(screen.getByRole('progressbar', { name: 'Meals progress' })).toHaveAttribute(
        'aria-valuenow',
        '2',
      );
    });

    it('offers a CTA to continue with the next meal while incomplete', async () => {
      const onNextMeal = vi.fn();
      render(
        <TodayObjectivesCard
          {...props({ meals: { complete: false, eaten: 2, target: 4, onNextMeal } })}
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: /log meal 3 of 4/i }));
      expect(onNextMeal).toHaveBeenCalledTimes(1);
    });

    it('drops the CTA once the meal target is reached', () => {
      render(
        <TodayObjectivesCard
          {...props({ meals: { complete: true, eaten: 4, target: 4, onNextMeal: vi.fn() } })}
        />,
      );

      expect(screen.getByRole('img', { name: 'Meals completed' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /log meal/i })).not.toBeInTheDocument();
    });
  });

  describe('macros objective', () => {
    it('shows protein, carbs and fat progress bars with amounts against target', () => {
      render(
        <TodayObjectivesCard
          {...props({
            macros: {
              complete: false,
              protein: macro(118, 200),
              carbs: macro(96, 250),
              fat: macro(41, 70),
              calories: macro(1420, 2400),
            },
          })}
        />,
      );

      expect(screen.getByRole('progressbar', { name: 'Protein progress' })).toHaveAttribute(
        'aria-valuenow',
        '118',
      );
      expect(screen.getByRole('progressbar', { name: 'Carbs progress' })).toBeInTheDocument();
      expect(screen.getByRole('progressbar', { name: 'Fat progress' })).toBeInTheDocument();
      expect(screen.getByText(/118 \/ 200/)).toBeInTheDocument();
      // Calories are context, not an objective: shown, but with no progress bar.
      expect(screen.getByText(/1420 \/ 2400/)).toBeInTheDocument();
      expect(screen.queryByRole('progressbar', { name: /calories/i })).not.toBeInTheDocument();
    });

    it('marks the objective complete only via the macros flag', () => {
      render(
        <TodayObjectivesCard
          {...props({
            macros: {
              complete: true,
              protein: macro(200, 200, true),
              carbs: macro(250, 250, true),
              fat: macro(70, 70, true),
              calories: macro(900, 2400),
            },
          })}
        />,
      );

      expect(screen.getByRole('img', { name: 'Macros completed' })).toBeInTheDocument();
    });
  });

  describe('all objectives complete', () => {
    const done = () =>
      props({
        weight: { complete: true, weightLbs: 182.5, onLogWeight: vi.fn() },
        meals: { complete: true, eaten: 4, target: 4, onNextMeal: vi.fn() },
        macros: {
          complete: true,
          protein: macro(200, 200, true),
          carbs: macro(250, 250, true),
          fat: macro(70, 70, true),
          calories: macro(2400, 2400, true),
        },
        allComplete: true,
        completedAtLabel: '8:42pm',
      });

    it('congratulates the user and shows when they finished', () => {
      render(<TodayObjectivesCard {...done()} />);

      expect(screen.getByText(/all objectives complete/i)).toBeInTheDocument();
      expect(screen.getByText(/8:42pm/)).toBeInTheDocument();
    });

    it('offers no CTAs', () => {
      render(<TodayObjectivesCard {...done()} />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('does not congratulate while anything is outstanding', () => {
      render(<TodayObjectivesCard {...props()} />);

      expect(screen.queryByText(/all objectives complete/i)).not.toBeInTheDocument();
    });
  });
});
