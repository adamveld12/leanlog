import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageNavHeading } from '../organisms/PageNavHeading';

const renderNavLink = ({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className: string;
}) => (
  <a className={className} href={href}>
    {label}
  </a>
);

const navLinks = [
  { href: '/track', label: 'Execute' },
  { href: '/track/goals', label: 'Goals' },
];

describe('PageNavHeading', () => {
  it('renders title, subtitle, and nav links', () => {
    render(
      <PageNavHeading
        title="Meal"
        subtitle="400 kcal"
        backHref="/day/1"
        navLinks={navLinks}
        renderNavLink={renderNavLink}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Meal' })).toBeInTheDocument();
    expect(screen.getAllByText('400 kcal')).toHaveLength(2);
    expect(screen.getByRole('link', { name: '← Back' })).toHaveAttribute('href', '/day/1');
    expect(screen.getByRole('link', { name: 'Execute' })).toHaveAttribute('href', '/track');
    expect(screen.getByRole('link', { name: 'Goals' })).toHaveAttribute('href', '/track/goals');
  });

  it('hides back link when backHref is not provided', () => {
    const { container } = render(
      <PageNavHeading title="leanlog" navLinks={navLinks} renderNavLink={renderNavLink} />,
    );
    const queries = within(container);

    expect(queries.getByRole('link', { name: 'Goals' })).toBeInTheDocument();
    expect(queries.queryByRole('link', { name: '← Back' })).toBeNull();
  });

  it('renders right-side content next to nav links', () => {
    const { container } = render(
      <PageNavHeading
        title="leanlog"
        navLinks={navLinks}
        rightContent={<button type="button">Auth</button>}
        renderNavLink={renderNavLink}
      />,
    );
    const queries = within(container);

    expect(queries.getByRole('link', { name: 'Goals' })).toBeInTheDocument();
    expect(queries.getByRole('button', { name: 'Auth' })).toBeInTheDocument();
  });
});
