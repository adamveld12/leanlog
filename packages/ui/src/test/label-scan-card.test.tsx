import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LabelScanCard, type LabelScanValue } from '../organisms/LabelScanCard';

afterEach(cleanup);

function Harness({ onScan = () => {} }: { onScan?: () => void }) {
  const [value, setValue] = useState<LabelScanValue>({
    name: '',
    checkForServings: false,
    entirePackage: false,
    amount: 0,
  });
  return <LabelScanCard value={value} onChange={setValue} onScan={onScan} />;
}

describe('LabelScanCard', () => {
  it('swaps the numeric label between weight and servings', async () => {
    render(<Harness />);
    expect(screen.getByLabelText('Weight (g or ml)')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Check for servings' }));
    expect(screen.getByLabelText('# of Servings')).toBeInTheDocument();
  });

  it('disables the numeric input when entire package is checked', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Entire package' }));
    expect(screen.getByLabelText('Weight (g or ml)')).toBeDisabled();
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
        value={{ name: 'Granola', checkForServings: false, entirePackage: false, amount: 30 }}
        loading
        error="Scan failed."
        onChange={() => {}}
        onScan={() => {}}
      />,
    );
    expect(screen.getByText('Scan failed.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scanning…' })).toBeDisabled();
  });
});
