import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ExtrasCard, type ExtraItem } from '../organisms/ExtrasCard';

const sample: ExtraItem[] = [
  { id: '1', name: 'Tortilla chips', calories: 150, protein: 0, carbs: 0, fat: 0 },
];

describe('ExtrasCard', () => {
  it('renders existing items and the add affordance', () => {
    render(<ExtrasCard items={sample} onAdd={() => {}} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('Tortilla chips')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Add extra' })).toBeInTheDocument();
  });

  it('is unobtrusive when empty and editable: no filler empty-state noise beyond the add button', () => {
    render(<ExtrasCard items={[]} onAdd={() => {}} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByRole('button', { name: '+ Add extra' })).toBeInTheDocument();
    expect(screen.queryByText('No items')).not.toBeInTheDocument();
  });

  it('renders nothing when read-only with no items (R5)', () => {
    const { container } = render(
      <ExtrasCard items={[]} onAdd={() => {}} onEdit={() => {}} onDelete={() => {}} readOnly />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('read-only hides the add button and delete actions but still lists items', () => {
    render(
      <ExtrasCard items={sample} onAdd={() => {}} onEdit={() => {}} onDelete={() => {}} readOnly />,
    );
    expect(screen.getByText('Tortilla chips')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Add extra' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('Add extra is disabled until name and calories are both present (R2/R7)', async () => {
    render(<ExtrasCard items={[]} onAdd={() => {}} onEdit={() => {}} onDelete={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: '+ Add extra' }));

    expect(screen.getByRole('button', { name: 'Add extra' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Name'), 'Red wine');
    expect(screen.getByRole('button', { name: 'Add extra' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Calories'), '125');
    expect(screen.getByRole('button', { name: 'Add extra' })).not.toBeDisabled();
  });

  it('adds an extra with calories only, macros defaulting to blank (R2/scenario: macros optional)', async () => {
    const onAdd = vi.fn();
    render(<ExtrasCard items={[]} onAdd={onAdd} onEdit={() => {}} onDelete={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: '+ Add extra' }));
    await userEvent.type(screen.getByLabelText('Name'), 'Red wine');
    await userEvent.type(screen.getByLabelText('Calories'), '125');
    await userEvent.click(screen.getByRole('button', { name: 'Add extra' }));

    expect(onAdd).toHaveBeenCalledWith({
      name: 'Red wine',
      calories: 125,
      protein: undefined,
      carbs: undefined,
      fat: undefined,
    });
  });

  it('expanding macros includes them in the add payload (scenario: optional macros)', async () => {
    const onAdd = vi.fn();
    render(<ExtrasCard items={[]} onAdd={onAdd} onEdit={() => {}} onDelete={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: '+ Add extra' }));
    await userEvent.type(screen.getByLabelText('Name'), 'Greek yogurt');
    await userEvent.type(screen.getByLabelText('Calories'), '120');
    await userEvent.click(screen.getByRole('button', { name: '+ Add macros' }));
    await userEvent.type(screen.getByLabelText('Protein (g)'), '15');
    await userEvent.type(screen.getByLabelText('Carbs (g)'), '9');
    await userEvent.click(screen.getByRole('button', { name: 'Add extra' }));

    expect(onAdd).toHaveBeenCalledWith({
      name: 'Greek yogurt',
      calories: 120,
      protein: 15,
      carbs: 9,
      fat: undefined,
    });
  });

  it('tapping a row loads it into the form for editing (scenario: edit an extra)', async () => {
    const onEdit = vi.fn();
    render(<ExtrasCard items={sample} onAdd={() => {}} onEdit={onEdit} onDelete={() => {}} />);
    await userEvent.click(screen.getByText('Tortilla chips'));

    const calories = screen.getByLabelText('Calories');
    expect(calories).toHaveValue('150');
    await userEvent.clear(calories);
    await userEvent.type(calories, '180');
    await userEvent.click(screen.getByRole('button', { name: 'Save extra' }));

    expect(onEdit).toHaveBeenCalledWith('1', {
      name: 'Tortilla chips',
      calories: 180,
      protein: undefined,
      carbs: undefined,
      fat: undefined,
    });
  });

  it('deletes an extra via its row action (scenario: delete an extra)', async () => {
    const onDelete = vi.fn();
    render(<ExtrasCard items={sample} onAdd={() => {}} onEdit={() => {}} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith('1');
  });
});
