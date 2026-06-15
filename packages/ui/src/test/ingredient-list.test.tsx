import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { IngredientList, type IngredientListItem } from '../organisms/IngredientList';

const item = (overrides: Partial<IngredientListItem> = {}): IngredientListItem => ({
  id: '1',
  name: 'Chicken breast',
  weight: 150,
  calories: 248,
  protein: 46,
  carbs: 0,
  fat: 5,
  sourceDatabaseIngredientId: null,
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

  it('only shows Save to database for rows not already linked', () => {
    render(
      <IngredientList
        ingredients={[item({ id: 'a' }), item({ id: 'b', sourceDatabaseIngredientId: 'db-1' })]}
        onEdit={() => {}}
        onDelete={() => {}}
        onSaveToDatabase={() => {}}
      />,
    );
    expect(screen.getAllByRole('button', { name: 'Save to database' })).toHaveLength(1);
  });

  it('disables Save to database when weight is zero', () => {
    render(
      <IngredientList
        ingredients={[item({ weight: 0 })]}
        onEdit={() => {}}
        onDelete={() => {}}
        onSaveToDatabase={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Save to database' })).toBeDisabled();
  });
});
