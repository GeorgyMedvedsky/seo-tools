import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { DashboardPage } from './dashboard-page';

describe('DashboardPage', () => {
  it('renders the header, the redirect generator card, and a coming-soon placeholder', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'SEO Tools' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Redirect Generator/ })).toHaveAttribute(
      'href',
      '/redirects',
    );
    expect(screen.getByText('More tools coming soon')).toBeInTheDocument();
  });
});
