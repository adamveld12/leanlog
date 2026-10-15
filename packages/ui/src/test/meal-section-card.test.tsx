import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MealSectionCard, type MealSectionItem } from '../organisms/MealSectionCard';

const item = (overrides: Partial<MealSectionItem> = {}): MealSectionItem => ({
  id: 'eggs',
  name: 'EGGS',
  calories: 140,
  protein: 12,
  carbs: 1,
  fat: 10,
  editable: true,
  ...overrides,
});

const totals = { calories: 140, protein: 12, carbs: 1, fat: 10 };

describe('MealSectionCard', () => {
  it('shows the section, its total calories and each food', () => {
    render(<MealSectionCard title="Breakfast" items={[item()]} totals={totals} onAdd={() => {}} />);
    const card = screen.getByRole('region', { name: 'Breakfast' });
    expect(within(card).getByText('EGGS')).toBeInTheDocument();
    expect(within(card).getByTestId('section-calories')).toHaveTextContent('140 kcal');
  });

  it('says nothing has been eaten when empty', () => {
    render(
      <MealSectionCard
        title="Lunch"
        items={[]}
        totals={{ calories: 0, protein: 0, carbs: 0, fat: 0 }}
        onAdd={() => {}}
      />,
    );
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
  });

  it('adds food to this section', async () => {
    const onAdd = vi.fn();
    render(<MealSectionCard title="Lunch" items={[]} totals={totals} onAdd={onAdd} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add food to Lunch' }));
    expect(onAdd).toHaveBeenCalled();
  });

  it('edits and deletes editable foods', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <MealSectionCard
        title="Breakfast"
        items={[item()]}
        totals={totals}
        onAdd={() => {}}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Delete EGGS' }));
    expect(onDelete).toHaveBeenCalledWith('eggs');
    expect(onEdit).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /^EGGS/ }));
    expect(onEdit).toHaveBeenCalledWith('eggs');
  });

  it('offers no edit or delete on foods that are not editable', () => {
    render(
      <MealSectionCard
        title="Snacks"
        items={[item({ id: 'chips', name: 'CHIPS', editable: false })]}
        totals={totals}
        onAdd={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Delete CHIPS' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^CHIPS/ })).not.toBeInTheDocument();
  });

  it('read-only hides every control', () => {
    render(
      <MealSectionCard
        title="Dinner"
        items={[item()]}
        totals={totals}
        readOnly
        onAdd={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows an error when adding food failed', () => {
    render(
      <MealSectionCard
        title="Lunch"
        items={[]}
        totals={totals}
        onAdd={() => {}}
        error="Couldn't open Lunch. Try again."
      />,
    );
    expect(screen.getByText("Couldn't open Lunch. Try again.")).toBeInTheDocument();
  });
});
