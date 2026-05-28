import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DayWeightCard } from '../organisms/DayWeightCard';

afterEach(cleanup);

describe('DayWeightCard', () => {
  it('renders helper text about weigh-in conditions', () => {
    render(
      <DayWeightCard
        weightLbs={180}
        onWeightChange={() => undefined}
        onWeightBlur={() => undefined}
      />,
    );
    expect(screen.getByText(/weigh yourself naked/i)).toBeInTheDocument();
  });

  it('pre-populates the input with the provided weight', () => {
    render(
      <DayWeightCard
        weightLbs={182}
        onWeightChange={() => undefined}
        onWeightBlur={() => undefined}
      />,
    );
    expect(screen.getByRole('textbox')).toHaveValue('182');
  });

  it('calls onWeightBlur when the input loses focus', async () => {
    const onBlur = vi.fn();
    render(
      <DayWeightCard weightLbs={180} onWeightChange={() => undefined} onWeightBlur={onBlur} />,
    );
    const input = screen.getByRole('textbox');
    await userEvent.click(input);
    await userEvent.tab();
    expect(onBlur).toHaveBeenCalledOnce();
  });
});
