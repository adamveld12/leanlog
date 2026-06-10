import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NumberInput } from '../atoms/NumberInput';

afterEach(cleanup);

describe('NumberInput', () => {
  it('ignores non-numeric text and supports decimal entry', async () => {
    const onChange = vi.fn();
    render(<NumberInput label="Calories" value={0} onChange={onChange} />);
    const input = screen.getByRole('textbox');

    await userEvent.clear(input);
    onChange.mockClear();
    await userEvent.type(input, 'abc');
    expect(onChange).not.toHaveBeenCalled();

    await userEvent.clear(input);
    await userEvent.type(input, '2.5');
    expect(onChange).toHaveBeenLastCalledWith(2.5);
  });

  it('emits null when the field is cleared', async () => {
    const onChange = vi.fn();
    render(<NumberInput label="Calories" value={42} onChange={onChange} />);
    const input = screen.getByRole('textbox');

    await userEvent.clear(input);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('renders empty with a placeholder for a null value', () => {
    render(
      <NumberInput label="Weight (g)" value={null} placeholder="e.g. 120" onChange={() => {}} />,
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('');
    expect(input).toHaveAttribute('placeholder', 'e.g. 120');
  });
});
