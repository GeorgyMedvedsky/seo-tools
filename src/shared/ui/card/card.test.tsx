import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Card } from './card';

describe('Card', () => {
  it('renders as a link to the given route with an icon, title, and description', () => {
    render(
      <MemoryRouter>
        <Card
          to="/redirects"
          icon={<span data-testid="icon" />}
          title="Redirect Generator"
          description="Generate redirect rules"
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /Redirect Generator/ });
    expect(link).toHaveAttribute('href', '/redirects');
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('Generate redirect rules')).toBeInTheDocument();
  });
});
