import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '../components/Button';
import { AuthLanding } from '../components/AuthLanding';

describe('AuthLanding', () => {
  it('renders heading, highlights, and cta', () => {
    render(
      <AuthLanding
        appName="LeanLog"
        iconSrc="/icon-192.png"
        cta={<Button>Sign in / Sign up</Button>}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'LeanLog' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in / Sign up' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Product highlights' })).toBeInTheDocument();
  });
});
