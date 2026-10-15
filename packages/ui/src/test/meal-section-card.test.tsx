import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
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

  describe('inline add (#102)', () => {
    it('expands in place to show the entry form, and the add button becomes Done', async () => {
      const onDone = vi.fn();
      render(
        <MealSectionCard
          title="Lunch"
          items={[]}
          totals={totals}
          onAdd={() => {}}
          onDone={onDone}
          expanded
          entry={<div>Entry form</div>}
        />,
      );
      const region = screen.getByTestId('section-entry');
      expect(region).not.toHaveAttribute('aria-hidden', 'true');
      expect(screen.getByText('Entry form')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Add food to Lunch' })).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Done adding to Lunch' }));
      expect(onDone).toHaveBeenCalled();
    });

    it('hides the entry form from assistive tech and focus while collapsed', () => {
      render(
        <MealSectionCard
          title="Lunch"
          items={[]}
          totals={totals}
          onAdd={() => {}}
          expanded={false}
          entry={<div>Entry form</div>}
        />,
      );
      const region = screen.getByTestId('section-entry');
      expect(region).toHaveAttribute('aria-hidden', 'true');
      expect(region).toHaveAttribute('inert');
    });

    it('reports when the collapse animation has finished', () => {
      vi.useFakeTimers();
      try {
        const onCollapsed = vi.fn();
        const props = {
          title: 'Lunch',
          items: [],
          totals,
          onAdd: () => {},
          onCollapsed,
          entry: <div>Entry form</div>,
        };
        const { rerender } = render(<MealSectionCard {...props} expanded />);
        rerender(<MealSectionCard {...props} expanded={false} />);
        expect(onCollapsed).not.toHaveBeenCalled();
        act(() => {
          vi.advanceTimersByTime(250);
        });
        expect(onCollapsed).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
