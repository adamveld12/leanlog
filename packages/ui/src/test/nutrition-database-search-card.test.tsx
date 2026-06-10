import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  NutritionDatabaseSearchCard,
  type NutritionDatabaseSearchResult,
} from '../organisms/NutritionDatabaseSearchCard';

const result1: NutritionDatabaseSearchResult = {
  id: 'ing-1',
  name: 'CHICKEN BREAST',
  servingAmount: 100,
  fat: 3.6,
  carbs: 0,
  protein: 31,
  fiber: null,
  calories: 165,
  addedByName: 'Adam',
  addedAtLabel: 'Jun 1, 2026',
  creationSource: 'manual',
};

const result2: NutritionDatabaseSearchResult = {
  id: 'ing-2',
  name: 'BROWN RICE',
  servingAmount: 100,
  fat: 0.9,
  carbs: 23,
  protein: 2.6,
  fiber: 1.8,
  calories: 110,
  addedByName: 'System',
  addedAtLabel: 'May 15, 2026',
  creationSource: 'scan',
};

function Harness({
  results,
  onAdd = () => {},
  onCreateNew,
}: {
  results: NutritionDatabaseSearchResult[];
  onAdd?: (id: string) => void;
  onCreateNew?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [amounts, setAmounts] = useState<Record<string, number>>({});

  return (
    <NutritionDatabaseSearchCard
      query={query}
      onQueryChange={setQuery}
      results={results}
      searched={true}
      amounts={amounts}
      onAmountChange={(id, amount) => setAmounts((prev) => ({ ...prev, [id]: amount }))}
      onAdd={onAdd}
      onCreateNew={onCreateNew}
    />
  );
}

afterEach(cleanup);

describe('NutritionDatabaseSearchCard', () => {
  it('renders result rows with name, added-by and date info', () => {
    render(<Harness results={[result1]} />);
    expect(screen.getByText('CHICKEN BREAST')).toBeInTheDocument();
    expect(screen.getByText(/Added by Adam/)).toBeInTheDocument();
    expect(screen.getByText(/Jun 1, 2026/)).toBeInTheDocument();
  });

  it('renders duplicate results as separate rows', () => {
    // Same ingredient id appears twice (e.g. two search result entries)
    render(<Harness results={[result1, result1]} />);
    const names = screen.getAllByText('CHICKEN BREAST');
    expect(names).toHaveLength(2);
    const addedByMatches = screen.getAllByText(/Added by Adam/);
    expect(addedByMatches).toHaveLength(2);
  });

  it('shows no-results message when searched and empty', () => {
    render(
      <NutritionDatabaseSearchCard
        query="xyz"
        onQueryChange={() => {}}
        results={[]}
        searched={true}
        amounts={{}}
        onAmountChange={() => {}}
        onAdd={() => {}}
      />,
    );
    expect(screen.getByText('No ingredients found.')).toBeInTheDocument();
  });

  it('does not show no-results when not yet searched', () => {
    render(
      <NutritionDatabaseSearchCard
        query=""
        onQueryChange={() => {}}
        results={[]}
        searched={false}
        amounts={{}}
        onAmountChange={() => {}}
        onAdd={() => {}}
      />,
    );
    expect(screen.queryByText('No ingredients found.')).not.toBeInTheDocument();
  });

  it('Add button is disabled when amount is 0', () => {
    render(<Harness results={[result1]} />);
    const addBtn = screen.getByRole('button', { name: 'Add' });
    expect(addBtn).toBeDisabled();
  });

  it('Add button enables when amount > 0', async () => {
    render(<Harness results={[result1]} />);
    const amountInput = screen.getByLabelText('Amount (g/ml)');
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, '150');
    const addBtn = screen.getByRole('button', { name: 'Add' });
    expect(addBtn).not.toBeDisabled();
  });

  it('calls onAdd with the correct id when Add is clicked', async () => {
    const onAdd = vi.fn();
    render(<Harness results={[result1]} onAdd={onAdd} />);
    const amountInput = screen.getByLabelText('Amount (g/ml)');
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, '100');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAdd).toHaveBeenCalledWith('ing-1');
  });

  it('disables Add while addingId matches', () => {
    render(
      <NutritionDatabaseSearchCard
        query="chicken"
        onQueryChange={() => {}}
        results={[result1]}
        searched={true}
        amounts={{ 'ing-1': 100 }}
        onAmountChange={() => {}}
        onAdd={() => {}}
        addingId="ing-1"
      />,
    );
    expect(screen.getByRole('button', { name: 'Adding…' })).toBeDisabled();
  });

  it('renders both results when multiple different results provided', () => {
    render(<Harness results={[result1, result2]} />);
    expect(screen.getByText('CHICKEN BREAST')).toBeInTheDocument();
    expect(screen.getByText('BROWN RICE')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <NutritionDatabaseSearchCard
        query="chicken"
        onQueryChange={() => {}}
        results={[]}
        loading={true}
        searched={false}
        amounts={{}}
        onAmountChange={() => {}}
        onAdd={() => {}}
      />,
    );
    expect(screen.getByText('Searching…')).toBeInTheDocument();
  });

  it('renders onCreateNew button when provided', () => {
    const onCreateNew = vi.fn();
    render(<Harness results={[]} onCreateNew={onCreateNew} />);
    const btn = screen.getByRole('button', { name: 'Add database ingredient' });
    expect(btn).toBeInTheDocument();
  });

  it('does not render onCreateNew button when not provided', () => {
    render(<Harness results={[]} />);
    expect(
      screen.queryByRole('button', { name: 'Add database ingredient' }),
    ).not.toBeInTheDocument();
  });
});
