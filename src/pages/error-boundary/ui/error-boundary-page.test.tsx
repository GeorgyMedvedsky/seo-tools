import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { ErrorBoundaryPage } from './error-boundary-page';

function ThrowingPage(): never {
  throw new Error('boom');
}

describe('ErrorBoundaryPage', () => {
  it('shows a generic message when there is no real route error to read', () => {
    const router = createMemoryRouter([{ path: '/', element: <ErrorBoundaryPage /> }]);
    render(<RouterProvider router={router} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred.')).toBeInTheDocument();
  });

  it('shows the real error message when a route throws (bug fix: was mislabeled as "page not found")', () => {
    const router = createMemoryRouter([
      { path: '/', element: <ThrowingPage />, errorElement: <ErrorBoundaryPage /> },
    ]);
    render(<RouterProvider router={router} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(screen.queryByText(/page.*not exist/i)).not.toBeInTheDocument();
  });

  it('links back to the dashboard', () => {
    const router = createMemoryRouter([{ path: '/', element: <ErrorBoundaryPage /> }]);
    render(<RouterProvider router={router} />);

    expect(screen.getByRole('link', { name: 'Back to dashboard' })).toHaveAttribute('href', '/');
  });
});
