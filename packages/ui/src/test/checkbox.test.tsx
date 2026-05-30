import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Checkbox } from '../atoms/Checkbox';

afterEach(cleanup);

describe('Checkbox', () => {
  it('renders its label and reflects the checked prop', () => {
    render(<Checkbox label="Check for servings" checked readOnly />);
    const box = screen.getByRole('checkbox', { name: 'Check for servings' });
    expect(box).toBeChecked();
  });

  it('toggles its checked state through onChange', async () => {
    const onChange = vi.fn();
    function Harness() {
      const [checked, setChecked] = useState(false);
      return (
        <Checkbox
          label="Entire package"
          checked={checked}
          onChange={(e) => {
            onChange();
            setChecked(e.target.checked);
          }}
        />
      );
    }
    render(<Harness />);
    const box = screen.getByRole('checkbox', { name: 'Entire package' });
    await userEvent.click(box);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(box).toBeChecked();
  });
});
