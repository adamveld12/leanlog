import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NumberInput } from '../components/NumberInput';

describe('NumberInput', () => {
  it('emits string changes', async () => {
    const onChange = vi.fn();
    render(<NumberInput label="Calories" value="" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, '12');
    expect(onChange).toHaveBeenCalled();
  });
});
