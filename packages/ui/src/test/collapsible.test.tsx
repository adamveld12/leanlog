import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Collapsible } from '../molecules/Collapsible';

describe('Collapsible', () => {
  it('shows the summary + Edit toggle when collapsed', () => {
    const onToggle = vi.fn();
    render(
      <Collapsible open={false} onToggle={onToggle} summary={<span>Weight: 182 lbs</span>}>
        <div>editor</div>
      </Collapsible>,
    );
    expect(screen.getByText('Weight: 182 lbs')).toBeInTheDocument();
    expect(screen.queryByText('editor')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('shows the children + collapse toggle when open', () => {
    const onToggle = vi.fn();
    render(
      <Collapsible open onToggle={onToggle} summary={<span>summary</span>}>
        <div>editor</div>
      </Collapsible>,
    );
    expect(screen.getByText('editor')).toBeInTheDocument();
    expect(screen.queryByText('summary')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse' }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('locked renders children and no toggle button', () => {
    render(
      <Collapsible open onToggle={vi.fn()} locked summary={<span>summary</span>}>
        <div>editor</div>
      </Collapsible>,
    );
    expect(screen.getByText('editor')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
