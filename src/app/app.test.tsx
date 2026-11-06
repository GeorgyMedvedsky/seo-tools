import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './app';

describe('App', () => {
  it('renders the dashboard at the root route', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'SEO Tools' })).toBeInTheDocument();
  });
});
