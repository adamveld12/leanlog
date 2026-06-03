import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ErrorTemplate } from '../templates/ErrorTemplate';

describe('ErrorTemplate', () => {
  it('renders a clear recovery page with home and retry actions', () => {
    render(
      <ErrorTemplate
        title="Unable to load LeanLog"
        message="API returned invalid payload (Not JSON) for /api/days"
        homeHref="/"
        retryLabel="Refresh page"
        onRetry={() => undefined}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Unable to load LeanLog' })).toBeInTheDocument();
    expect(
      screen.getByText('API returned invalid payload (Not JSON) for /api/days'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('button', { name: 'Refresh page' })).toBeInTheDocument();
  });
});
