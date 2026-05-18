import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ListSectionCard } from '../components/ListSectionCard';

describe('ListSectionCard', () => {
  it('renders rows and supports open/delete with defaults and metric slot', async () => {
    const onOpen = vi.fn();
    const onDelete = vi.fn();

    render(
      <ListSectionCard
        title="Meals"
        items={[
          {
            id: 'm1',
            title: 'MEAL 1',
            meta: '120 kcal',
            rightMetric: <span>2 items</span>,
            onOpen,
            onDelete,
          },
        ]}
      />,
    );

    expect(screen.getByText('Meals')).toBeInTheDocument();
    expect(screen.getByText('MEAL 1')).toBeInTheDocument();
    expect(screen.getByText('120 kcal')).toBeInTheDocument();
    expect(screen.getByText('2 items')).toBeInTheDocument();
    expect(screen.getAllByText('Delete')[0]).toBeInTheDocument();

    await userEvent.click(screen.getByRole('link'));
    expect(onOpen).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getAllByText('Delete')[0]);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('uses default and custom empty text', () => {
    const { rerender } = render(<ListSectionCard title="Empty" items={[]} />);
    expect(screen.getByText('No items')).toBeInTheDocument();

    rerender(<ListSectionCard title="Empty" items={[]} emptyText="Nothing here yet" />);
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
  });
});
