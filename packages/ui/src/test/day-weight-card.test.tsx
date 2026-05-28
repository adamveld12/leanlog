import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DayWeightCard } from '../organisms/DayWeightCard';

afterEach(cleanup);

describe('DayWeightCard', () => {
  it('renders helper text about weigh-in conditions', () => {
    render(<DayWeightCard weightLbs={180} onSave={() => undefined} />);
    expect(screen.getByText(/weigh in first thing in the morning/i)).toBeInTheDocument();
  });

  it('pre-populates the input with the provided weight', () => {
    render(<DayWeightCard weightLbs={182} onSave={() => undefined} />);
    expect(screen.getByRole('textbox')).toHaveValue('182');
  });

  it('disables Save until the input differs from the current value', () => {
    render(<DayWeightCard weightLbs={180} onSave={() => undefined} />);
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('calls onSave with the typed value when Save is clicked', async () => {
    const onSave = vi.fn();
    render(<DayWeightCard weightLbs={180} onSave={onSave} />);
    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, '182');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).toHaveBeenCalledWith(182);
  });

  it('shows a Saving label and disables Save while a save is in flight', () => {
    render(<DayWeightCard weightLbs={180} saving onSave={() => undefined} />);
    const button = screen.getByRole('button', { name: /saving/i });
    expect(button).toBeDisabled();
  });
});
