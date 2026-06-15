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
  totalCount,
}: {
  results: NutritionDatabaseSearchResult[];
  onAdd?: (id: string) => void;
  onCreateNew?: () => void;
  totalCount?: number;
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
      onAmountChange={(id, amount) => setAmounts((prev) => ({ ...prev, [id]: amount ?? 0 }))}
      onAdd={onAdd}
      onCreateNew={onCreateNew}
      totalCount={totalCount}
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
    const amountInput = screen.getByLabelText('Weight (g/ml)');
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, '150');
    const addBtn = screen.getByRole('button', { name: 'Add' });
    expect(addBtn).not.toBeDisabled();
  });

  it('calls onAdd with the correct id when Add is clicked', async () => {
    const onAdd = vi.fn();
    render(<Harness results={[result1]} onAdd={onAdd} />);
    const amountInput = screen.getByLabelText('Weight (g/ml)');
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, '100');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAdd).toHaveBeenCalledWith('ing-1');
  });

  it('hides the amount input and enables Add in entire-package mode (R22)', () => {
    render(
      <NutritionDatabaseSearchCard
        query="chicken"
        onQueryChange={() => {}}
        results={[result1]}
        searched={true}
        amounts={{}}
        onAmountChange={() => {}}
        modes={{ 'ing-1': 'package' }}
        onModeChange={() => {}}
        onAdd={() => {}}
      />,
    );
    expect(screen.queryByLabelText('Weight (g/ml)')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).not.toBeDisabled();
  });

  it('switches the amount label to servings in servings mode', () => {
    render(
      <NutritionDatabaseSearchCard
        query="chicken"
        onQueryChange={() => {}}
        results={[result1]}
        searched={true}
        amounts={{}}
        onAmountChange={() => {}}
        modes={{ 'ing-1': 'servings' }}
        onModeChange={() => {}}
        onAdd={() => {}}
      />,
    );
    expect(screen.getByLabelText('# of servings')).toBeInTheDocument();
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
    const btn = screen.getByRole('button', { name: 'Add an ingredient' });
    expect(btn).toBeInTheDocument();
  });

  it('does not render onCreateNew button when not provided', () => {
    render(<Harness results={[]} />);
    expect(screen.queryByRole('button', { name: 'Add an ingredient' })).not.toBeInTheDocument();
  });

  it('renders the Scan to add button inside the card and fires onScanLabel', async () => {
    const onScanLabel = vi.fn();
    render(
      <NutritionDatabaseSearchCard
        query=""
        onQueryChange={() => {}}
        results={[]}
        searched={false}
        amounts={{}}
        onAmountChange={() => {}}
        onAdd={() => {}}
        onScanLabel={onScanLabel}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Scan to add' }));
    expect(onScanLabel).toHaveBeenCalledTimes(1);
  });

  it('disables every control on the card while scanning', () => {
    render(
      <NutritionDatabaseSearchCard
        query="chicken"
        onQueryChange={() => {}}
        results={[result1]}
        searched={true}
        amounts={{ 'ing-1': 150 }}
        onAmountChange={() => {}}
        modes={{ 'ing-1': 'weight' }}
        onModeChange={() => {}}
        onAdd={() => {}}
        onCreateNew={() => {}}
        onScanLabel={() => {}}
        scanning
      />,
    );
    expect(screen.getByPlaceholderText('e.g. Chicken breast')).toBeDisabled();
    expect(screen.getByLabelText('Add by')).toBeDisabled();
    expect(screen.getByLabelText('Weight (g/ml)')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add an ingredient' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Scanning…' })).toBeDisabled();
  });

  it('shows the scanning label and disables the scan button while scanning', () => {
    render(
      <NutritionDatabaseSearchCard
        query=""
        onQueryChange={() => {}}
        results={[]}
        searched={false}
        amounts={{}}
        onAmountChange={() => {}}
        onAdd={() => {}}
        onScanLabel={() => {}}
        scanning
      />,
    );
    expect(screen.getByRole('button', { name: 'Scanning…' })).toBeDisabled();
  });

  it('shows the total count in the search label when totalCount provided', () => {
    render(<Harness results={[]} totalCount={42} />);
    expect(screen.getByText('42 ingredients available for searching')).toBeInTheDocument();
  });

  it('uses singular wording when totalCount is 1', () => {
    render(<Harness results={[]} totalCount={1} />);
    expect(screen.getByText('1 ingredient available for searching')).toBeInTheDocument();
  });

  it('falls back to the default search label without totalCount', () => {
    render(<Harness results={[]} />);
    expect(screen.getByText('Search ingredients')).toBeInTheDocument();
  });
});
