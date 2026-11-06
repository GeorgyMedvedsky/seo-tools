import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { i18next } from 'shared/config';
import { AppHeader } from './app-header';

function renderHeader() {
  return render(
    <MemoryRouter>
      <AppHeader />
    </MemoryRouter>,
  );
}

afterEach(async () => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  await i18next.changeLanguage('en');
});

describe('AppHeader', () => {
  it('links the logo to the dashboard', () => {
    renderHeader();
    expect(screen.getByRole('link', { name: 'SEO Tools' })).toHaveAttribute('href', '/');
  });

  it('toggles between dark and light theme on click', async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole('button', { name: 'Switch to light theme' }));

    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));

    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('switches the interface language and persists the choice', async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole('button', { name: 'Switch to Russian' }));

    expect(screen.getByRole('button', { name: 'Переключить на английский' })).toBeInTheDocument();
    expect(document.documentElement.getAttribute('lang')).toBe('ru');
    expect(localStorage.getItem('language')).toBe('ru');

    await user.click(screen.getByRole('button', { name: 'Переключить на английский' }));

    expect(screen.getByRole('button', { name: 'Switch to Russian' })).toBeInTheDocument();
    expect(document.documentElement.getAttribute('lang')).toBe('en');
  });
});
