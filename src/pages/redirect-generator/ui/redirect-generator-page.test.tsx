import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { RedirectGeneratorPage } from './redirect-generator-page';

function renderPage() {
  return render(
    <MemoryRouter>
      <span data-testid="outside" />
      <RedirectGeneratorPage />
    </MemoryRouter>,
  );
}

describe('RedirectGeneratorPage', () => {
  it('renders the header, the form, and the settings toggle', () => {
    renderPage();
    expect(screen.getByRole('link', { name: 'SEO Tools' })).toBeInTheDocument();
    expect(screen.getByLabelText('Enter the target URL:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Toggle settings panel' })).toBeInTheDocument();
  });

  it('opens the settings panel on toggle and closes it on outside click', async () => {
    const user = userEvent.setup();
    renderPage();
    const toggle = screen.getByRole('button', { name: 'Toggle settings panel' });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByTestId('outside'));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the settings panel with Escape', async () => {
    const user = userEvent.setup();
    renderPage();
    const toggle = screen.getByRole('button', { name: 'Toggle settings panel' });

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('traps Tab focus within the open settings panel', async () => {
    const user = userEvent.setup();
    renderPage();
    const toggle = screen.getByRole('button', { name: 'Toggle settings panel' });
    await user.click(toggle);

    const externalLink = screen.getByRole('link', { name: 'Check redirect list' });

    externalLink.focus();
    await user.tab();
    expect(document.activeElement).toBe(toggle);

    toggle.focus();
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(externalLink);
  });

  it('lets the template and grouping settings be changed', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Toggle settings panel' }));

    await user.click(screen.getByLabelText('Group'));
    expect(screen.getByLabelText('Group')).toBeChecked();

    await user.selectOptions(screen.getByLabelText('Select a template:'), 'apache');
    expect(screen.getByLabelText('Select a template:')).toHaveValue('apache');
  });

  it('exposes the external redirect checker link safely (bug fix)', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Toggle settings panel' }));

    const link = screen.getByRole('link', { name: 'Check redirect list' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  describe('pairs mode', () => {
    it('switches the form to a single pairs textarea and hides the grouping checkbox', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByRole('button', { name: 'Toggle settings panel' }));

      await user.selectOptions(screen.getByLabelText('Redirect mode:'), 'pairs');

      expect(screen.queryByLabelText('Enter the target URL:')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Enter addresses, one per line')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Group')).not.toBeInTheDocument();
      expect(
        screen.getByLabelText('Enter source and target URL pairs, one pair per line'),
      ).toBeInstanceOf(HTMLTextAreaElement);
    });

    it('generates an independent rule per pair and flags a conflicting source', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByRole('button', { name: 'Toggle settings panel' }));
      await user.selectOptions(screen.getByLabelText('Redirect mode:'), 'pairs');
      await user.click(screen.getByTestId('outside'));

      await user.type(
        screen.getByLabelText('Enter source and target URL pairs, one pair per line'),
        'https://old.com/a к https://new.com/one\nhttps://old.com/a к https://new.com/two',
      );
      await user.click(screen.getByRole('button', { name: 'Generate redirects' }));

      expect(
        screen.getByText('These source URLs are mapped to more than one target:'),
      ).toBeInTheDocument();
      expect(screen.getByText('/a')).toBeInTheDocument();
    });
  });
});
