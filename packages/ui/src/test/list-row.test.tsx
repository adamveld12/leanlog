import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ListRow } from '../molecules/ListRow';
import { Button } from '../atoms/Button';

describe('ListRow', () => {
  it('activates onOpen when the row itself is keyboard-activated', async () => {
    const onOpen = vi.fn();
    render(<ListRow title="Chicken" onOpen={onOpen} />);

    const row = screen.getByRole('button', { name: /Chicken/ });
    row.focus();
    await userEvent.keyboard('{Enter}');

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('does not fire onOpen when a child action button is keyboard-activated', async () => {
    const onOpen = vi.fn();
    const onDelete = vi.fn();
    render(
      <ListRow
        title="Chicken"
        onOpen={onOpen}
        actions={
          <Button
            aria-label="Delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            ✕
          </Button>
        }
      />,
    );

    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    deleteBtn.focus();
    await userEvent.keyboard('{Enter}');

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });
});
