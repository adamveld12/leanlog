import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReorderableList } from '../molecules/ReorderableList';

const items = [
  { id: 'a', title: 'Breakfast' },
  { id: 'b', title: 'Lunch' },
  { id: 'c', title: 'Dinner' },
];

describe('ReorderableList', () => {
  afterEach(cleanup);

  it('moves an item down via the Down button', async () => {
    const onReorder = vi.fn();
    render(<ReorderableList items={items} onReorder={onReorder} />);
    const downButtons = screen.getAllByRole('button', { name: 'Move down' });
    await userEvent.click(downButtons[0]); // move "a" down
    expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c']);
  });

  it('moves an item up via the Up button', async () => {
    const onReorder = vi.fn();
    render(<ReorderableList items={items} onReorder={onReorder} />);
    const upButtons = screen.getAllByRole('button', { name: 'Move up' });
    await userEvent.click(upButtons[2]); // move "c" up
    expect(onReorder).toHaveBeenCalledWith(['a', 'c', 'b']);
  });

  it('disables Up on the first row and Down on the last row', () => {
    render(<ReorderableList items={items} onReorder={() => undefined} />);
    expect(screen.getAllByRole('button', { name: 'Move up' })[0]).toBeDisabled();
    const downButtons = screen.getAllByRole('button', { name: 'Move down' });
    expect(downButtons[downButtons.length - 1]).toBeDisabled();
  });
});
