import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { IngredientList, type IngredientListItem } from '../organisms/IngredientList';

const item = (overrides: Partial<IngredientListItem> = {}): IngredientListItem => ({
  id: '1',
  name: 'Chicken breast',
  calories: 248,
  protein: 46,
  carbs: 0,
  fat: 5,
  ...overrides,
});

describe('IngredientList', () => {
  it('renders an empty state when there are no ingredients', () => {
    render(<IngredientList ingredients={[]} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('opens edit for the tapped row', async () => {
    const onEdit = vi.fn();
    render(<IngredientList ingredients={[item()]} onEdit={onEdit} onDelete={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /Chicken breast/ }));
    expect(onEdit).toHaveBeenCalledWith('1');
  });

  it('deletes by id without triggering edit', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<IngredientList ingredients={[item()]} onEdit={onEdit} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete ingredient' }));
    expect(onDelete).toHaveBeenCalledWith('1');
    expect(onEdit).not.toHaveBeenCalled();
  });
});
