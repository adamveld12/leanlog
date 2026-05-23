import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NumberInput } from '../atoms/NumberInput';

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
});
