import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LabelScanCard, type LabelScanValue } from '../organisms/LabelScanCard';

afterEach(cleanup);

function Harness({ onScan = () => {} }: { onScan?: () => void }) {
  const [value, setValue] = useState<LabelScanValue>({
    mode: 'weight',
    amount: 0,
  });
  return <LabelScanCard value={value} onChange={setValue} onScan={onScan} />;
}

describe('LabelScanCard', () => {
  it('swaps the numeric label between weight and servings', async () => {
    render(<Harness />);
    expect(screen.getByLabelText('Weight (g or ml)')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: 'Servings' }));
    expect(screen.getByLabelText('# of Servings')).toBeInTheDocument();
  });

  it('hides the numeric input when entire package is selected', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('radio', { name: 'Entire package' }));
    expect(screen.queryByLabelText('Weight (g or ml)')).not.toBeInTheDocument();
  });

  it('invokes onScan when Scan Label is clicked', async () => {
    const onScan = vi.fn();
    render(<Harness onScan={onScan} />);
    await userEvent.click(screen.getByRole('button', { name: 'Scan Label' }));
    expect(onScan).toHaveBeenCalledTimes(1);
  });

  it('shows error text and a scanning state', () => {
    render(
      <LabelScanCard
        value={{ mode: 'weight', amount: 30 }}
        loading
        error="Scan failed."
        onChange={() => {}}
        onScan={() => {}}
      />,
    );
    expect(screen.getByText('Scan failed.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scanning…' })).toBeDisabled();
  });

  it('does not render an Ingredient Name field', () => {
    render(<Harness />);
    expect(screen.queryByLabelText('Ingredient Name')).not.toBeInTheDocument();
  });
});
