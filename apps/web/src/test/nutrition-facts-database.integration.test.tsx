import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, type Mock } from 'vitest';
import App from '../App';
import { api } from '../api';
import { StateProvider } from '../state';
import type { NutritionDatabaseIngredientSearchResult } from '../types';

const apiMock = api as unknown as {
  days: { list: Mock };
  mealTemplates: { list: Mock };
  nutritionDatabase: { list: Mock; search: Mock; create: Mock; update: Mock; delete: Mock };
};

// Modal uses the native <dialog>; jsdom doesn't implement showModal/close.
beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function () {
      this.open = false;
    };
  }
});

const now = new Date().toISOString();

function record(
  overrides: Partial<NutritionDatabaseIngredientSearchResult> & { id: string; name: string },
): NutritionDatabaseIngredientSearchResult {
  return {
    servingAmount: 40,
    servingSizeUnit: 'gram',
    servingSizeDisplayText: null,
    servingsPerPackage: 12,
    addedByUserId: 'user_test',
    addedByName: 'Test User',
    creationSource: 'manual',
    fat: 2.5,
    carbs: 27,
    protein: 5,
    saturatedFat: null,
    unsaturatedFat: null,
    monounsaturatedFat: null,
    polyunsaturatedFat: null,
    transFat: null,
    fiber: null,
    sugar: null,
    addedSugars: null,
    calories: 148,
    sugarAlcohol: null,
    allulose: null,
    alcohol: null,
    micronutrients: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function renderApp(route: string) {
  return render(
    <StateProvider>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </StateProvider>,
  );
}

function rowFor(name: string): HTMLElement {
  // The row card is the nearest ancestor that also contains the action buttons.
  const heading = screen.getByText(name);
  return heading.closest('div.p-3') as HTMLElement;
}

afterEach(() => {
  cleanup();
  apiMock.days.list.mockResolvedValue({ days: [] });
  apiMock.mealTemplates.list.mockResolvedValue({ templates: [] });
  apiMock.nutritionDatabase.list.mockReset();
  apiMock.nutritionDatabase.search.mockReset();
  apiMock.nutritionDatabase.create.mockReset();
  apiMock.nutritionDatabase.update.mockReset();
  apiMock.nutritionDatabase.delete.mockReset();
});

describe('Nutrition Facts Database page', () => {
  it('browses the catalog on load and gates Edit/Delete to owned labels', async () => {
    apiMock.nutritionDatabase.list.mockResolvedValue({
      results: [
        record({ id: 'mine', name: 'MY OATS', addedByUserId: 'user_test' }),
        record({ id: 'theirs', name: 'THEIR RICE', addedByUserId: 'user_other' }),
      ],
      total: 2,
    });

    renderApp('/track/nutrition-facts');

    await waitFor(() => expect(screen.getByText('MY OATS')).toBeInTheDocument());
    expect(screen.getByText('THEIR RICE')).toBeInTheDocument();
    // Browsed without a search query.
    expect(apiMock.nutritionDatabase.list).toHaveBeenCalled();

    // Owned label exposes manage actions; the other user's does not.
    expect(within(rowFor('MY OATS')).getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(within(rowFor('THEIR RICE')).queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(within(rowFor('THEIR RICE')).queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  it('searches the catalog when the query reaches 2 chars', async () => {
    apiMock.nutritionDatabase.list.mockResolvedValue({ results: [], total: 0 });
    apiMock.nutritionDatabase.search.mockResolvedValue({
      results: [record({ id: 'q1', name: 'QUINOA' })],
      total: 5,
    });

    renderApp('/track/nutrition-facts');

    const input = await screen.findByPlaceholderText('e.g. Chicken breast');
    await userEvent.type(input, 'qu');

    await waitFor(
      () => expect(apiMock.nutritionDatabase.search).toHaveBeenCalledWith('test-token', 'qu'),
      {
        timeout: 1000,
      },
    );
    await waitFor(() => expect(screen.getByText('QUINOA')).toBeInTheDocument());
  });

  it('edits an owned label and persists the change', async () => {
    apiMock.nutritionDatabase.list.mockResolvedValue({
      results: [record({ id: 'mine', name: 'MY OATS' })],
      total: 1,
    });
    apiMock.nutritionDatabase.update.mockImplementation(
      (_t: string, id: string, data: Record<string, unknown>) =>
        Promise.resolve(record({ id, name: data.name as string })),
    );

    renderApp('/track/nutrition-facts');

    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));

    const nameInput = await screen.findByRole('textbox', { name: 'Name' });
    expect(nameInput).toHaveValue('MY OATS');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'ROLLED OATS');
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() =>
      expect(apiMock.nutritionDatabase.update).toHaveBeenCalledWith(
        'test-token',
        'mine',
        expect.objectContaining({ name: 'ROLLED OATS' }),
      ),
    );
    // creationSource is immutable and must not be sent on an edit.
    const sent = apiMock.nutritionDatabase.update.mock.calls[0]![2] as Record<string, unknown>;
    expect(sent).not.toHaveProperty('creationSource');
    await waitFor(() => expect(screen.getByText('ROLLED OATS')).toBeInTheDocument());
  });

  it('deletes an owned label after confirming', async () => {
    apiMock.nutritionDatabase.list.mockResolvedValue({
      results: [record({ id: 'mine', name: 'MY OATS' })],
      total: 1,
    });
    apiMock.nutritionDatabase.delete.mockResolvedValue(undefined);

    renderApp('/track/nutrition-facts');

    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    // Confirmation modal; confirm the deletion.
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(apiMock.nutritionDatabase.delete).toHaveBeenCalledWith('test-token', 'mine'),
    );
    await waitFor(() => expect(screen.queryByText('MY OATS')).not.toBeInTheDocument());
  });

  it('manually creates a new label', async () => {
    apiMock.nutritionDatabase.list.mockResolvedValue({ results: [], total: 0 });
    apiMock.nutritionDatabase.create.mockImplementation(
      (_t: string, data: Record<string, unknown>) =>
        Promise.resolve(record({ id: 'created', name: data.name as string })),
    );

    renderApp('/track/nutrition-facts');

    await userEvent.click(await screen.findByRole('button', { name: 'Add an ingredient' }));

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'TEMPEH');
    await userEvent.type(screen.getByLabelText('Serving size'), '100');
    await userEvent.type(screen.getByLabelText('Servings per package'), '3');
    await userEvent.type(screen.getByLabelText('Calories (kcal)'), '195');
    await userEvent.tab();
    await userEvent.type(screen.getByLabelText('Fat (g)'), '11');
    await userEvent.type(screen.getByLabelText('Carbs (g)'), '8');
    await userEvent.type(screen.getByLabelText('Protein (g)'), '20');

    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() =>
      expect(apiMock.nutritionDatabase.create).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining({ name: 'TEMPEH', creationSource: 'manual' }),
      ),
    );
    await waitFor(() => expect(screen.getByText('TEMPEH')).toBeInTheDocument());
  });
});
