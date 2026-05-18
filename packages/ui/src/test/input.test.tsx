import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Input } from '../components/Input';

describe('Input', () => {
  it('keeps spaces while typing and only normalizes on blur when configured', async () => {
    const onNormalize = vi.fn();
    render(
      <Input
        defaultValue=""
        normalizeOnBlur={(v) => v.trim().replace(/\s+/g, ' ').toUpperCase()}
        onNormalized={onNormalize}
      />,
    );

    const input = screen.getByRole('textbox') as HTMLInputElement;
    await userEvent.type(input, 'chicken   breast ');
    expect(input.value).toBe('chicken   breast ');

    input.blur();
    expect(onNormalize).toHaveBeenCalledWith('CHICKEN BREAST');
  });
});
