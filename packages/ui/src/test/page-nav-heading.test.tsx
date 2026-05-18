import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageNavHeading } from '../components/PageNavHeading';

describe('PageNavHeading', () => {
  it('renders title, subtitle, and nav links', () => {
    render(
      <PageNavHeading title="Meal" subtitle="400 kcal" backHref="/day/1" profileHref="/profile" />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Meal' })).toBeInTheDocument();
    expect(screen.getAllByText('400 kcal')).toHaveLength(2);
    expect(screen.getByRole('link', { name: '← Back' })).toHaveAttribute('href', '/day/1');
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile');
  });

  it('hides back link when backHref is not provided', () => {
    const { container } = render(<PageNavHeading title="leanlog" profileHref="/profile" />);
    const queries = within(container);

    expect(queries.getByRole('link', { name: 'Profile' })).toBeInTheDocument();
    expect(queries.queryByRole('link', { name: '← Back' })).toBeNull();
  });
});
