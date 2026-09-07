import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ExtraQuickAddForm } from '../molecules/ExtraQuickAddForm';

describe('ExtraQuickAddForm', () => {
  it('disables submit until name and calories are both present (R2/R7)', async () => {
    render(<ExtraQuickAddForm submitLabel="Add extra" onSubmit={() => {}} onCancel={() => {}} />);

    expect(screen.getByRole('button', { name: 'Add extra' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Name'), 'Red wine');
    expect(screen.getByRole('button', { name: 'Add extra' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Calories'), '125');
    expect(screen.getByRole('button', { name: 'Add extra' })).not.toBeDisabled();
  });

  it('submits with macros undefined when the expand is never opened', async () => {
    const onSubmit = vi.fn();
    render(<ExtraQuickAddForm submitLabel="Add extra" onSubmit={onSubmit} onCancel={() => {}} />);

    await userEvent.type(screen.getByLabelText('Name'), 'Red wine');
    await userEvent.type(screen.getByLabelText('Calories'), '125');
    await userEvent.click(screen.getByRole('button', { name: 'Add extra' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Red wine',
      calories: 125,
      protein: undefined,
      carbs: undefined,
      fat: undefined,
    });
  });

  it('expanding macros includes them in the submit payload', async () => {
    const onSubmit = vi.fn();
    render(<ExtraQuickAddForm submitLabel="Add extra" onSubmit={onSubmit} onCancel={() => {}} />);

    await userEvent.type(screen.getByLabelText('Name'), 'Greek yogurt');
    await userEvent.type(screen.getByLabelText('Calories'), '120');
    await userEvent.click(screen.getByRole('button', { name: '+ Add macros' }));
    await userEvent.type(screen.getByLabelText('Protein (g)'), '15');
    await userEvent.type(screen.getByLabelText('Carbs (g)'), '9');
    await userEvent.click(screen.getByRole('button', { name: 'Add extra' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Greek yogurt',
      calories: 120,
      protein: 15,
      carbs: 9,
      fat: undefined,
    });
  });

  it('prefills from initial and auto-expands macros when any are non-zero', () => {
    render(
      <ExtraQuickAddForm
        submitLabel="Save extra"
        initial={{ name: 'Tortilla chips', calories: 150, protein: 2, carbs: 20, fat: 8 }}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByLabelText('Name')).toHaveValue('Tortilla chips');
    expect(screen.getByLabelText('Calories')).toHaveValue('150');
    expect(screen.getByLabelText('Protein (g)')).toHaveValue('2');
    expect(screen.getByLabelText('Carbs (g)')).toHaveValue('20');
    expect(screen.getByLabelText('Fat (g)')).toHaveValue('8');
  });

  it('does not auto-expand macros when initial macros are all zero', () => {
    render(
      <ExtraQuickAddForm
        submitLabel="Save extra"
        initial={{ name: 'Red wine', calories: 125, protein: 0, carbs: 0, fat: 0 }}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.queryByLabelText('Protein (g)')).not.toBeInTheDocument();
  });

  it('autoFocus focuses the name field on mount', () => {
    render(
      <ExtraQuickAddForm
        submitLabel="Add extra"
        autoFocus
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByLabelText('Name')).toHaveFocus();
  });

  it('fires onCancel without submitting', async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    render(<ExtraQuickAddForm submitLabel="Add extra" onSubmit={onSubmit} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
