import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ProgressBar } from '../atoms/ProgressBar';

afterEach(cleanup);

describe('ProgressBar', () => {
  it('renders with progressbar role', () => {
    render(<ProgressBar value={50} max={100} aria-label="Test" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('sets aria attributes', () => {
    render(<ProgressBar value={50} max={100} aria-label="Test progress" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-label', 'Test progress');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuenow', '50');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('accepts aria-valuetext for over-target values', () => {
    render(<ProgressBar value={120} max={100} aria-label="Fat" aria-valuetext="120 of 100g" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '120 of 100g');
  });
});
