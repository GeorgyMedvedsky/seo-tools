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

async function selectOption(
  user: ReturnType<typeof userEvent.setup>,
  labelText: string,
  optionName: string,
) {
  await user.click(screen.getByLabelText(labelText));
  await user.click(screen.getByRole('option', { name: optionName }));
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

    await selectOption(user, 'Select a template:', 'Apache');
    expect(screen.getByLabelText('Select a template:')).toHaveTextContent('Apache');
  });

  it('switches the output-file help instructions to Apache when the template changes', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Toggle settings panel' }));
    await selectOption(user, 'Select a template:', 'Apache');
    await user.click(screen.getByTestId('outside'));

    await user.click(screen.getByRole('button', { name: 'How to use this file' }));

    expect(
      screen.getByText(
        "Place this file as .htaccess in your site's document root — Apache picks it up automatically.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Make sure AllowOverride is not set to None for the relevant directives in your main config.',
      ),
    ).toBeInTheDocument();
  });

  it('lets the merge setting be toggled, defaulting to enabled, affecting the generated output', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Toggle settings panel' }));

    expect(screen.getByLabelText('Merge rules with the same target')).toBeChecked();

    await user.click(screen.getByLabelText('Merge rules with the same target'));
    expect(screen.getByLabelText('Merge rules with the same target')).not.toBeChecked();
    await user.click(screen.getByTestId('outside'));

    await user.type(screen.getByLabelText('Enter the target URL:'), 'https://example.com/target');
    await user.type(
      screen.getByLabelText('Enter addresses, one per line'),
      'https://example.com/a\nhttps://example.com/b',
    );
    await user.click(screen.getByRole('button', { name: 'Generate redirects' }));

    const output = document.getElementById('output')?.textContent ?? '';
    expect(output.match(/location/g)).toHaveLength(2);
  });

  it('names the download button after the template-specific config filename', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole('button', { name: 'Download redirects.conf' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Toggle settings panel' }));
    await selectOption(user, 'Select a template:', 'Apache');
    await user.click(screen.getByTestId('outside'));

    expect(screen.getByRole('button', { name: 'Download .htaccess' })).toBeInTheDocument();
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

      await selectOption(user, 'Redirect mode:', 'Individual target per URL');

      expect(screen.queryByLabelText('Enter the target URL:')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Enter addresses, one per line')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Group')).not.toBeInTheDocument();
      expect(
        screen.getByLabelText('Enter source and target URL pairs, one pair per line'),
      ).toBeInstanceOf(HTMLTextAreaElement);
    });

    it('fills the pairs textarea from an uploaded file', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByRole('button', { name: 'Toggle settings panel' }));
      await selectOption(user, 'Redirect mode:', 'Individual target per URL');
      await user.click(screen.getByTestId('outside'));

      const file = new File(['https://old.com/a к https://new.com/a-new\n'], 'pairs.csv', {
        type: 'text/csv',
      });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, file);

      expect(
        screen.getByLabelText('Enter source and target URL pairs, one pair per line'),
      ).toHaveValue('https://old.com/a к https://new.com/a-new\n');
    });

    it('generates an independent rule per pair and flags a conflicting source', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByRole('button', { name: 'Toggle settings panel' }));
      await selectOption(user, 'Redirect mode:', 'Individual target per URL');
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

    it('collapses a redirect chain and shows an informational notice', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByRole('button', { name: 'Toggle settings panel' }));
      await selectOption(user, 'Redirect mode:', 'Individual target per URL');
      await user.click(screen.getByTestId('outside'));

      await user.type(
        screen.getByLabelText('Enter source and target URL pairs, one pair per line'),
        'https://old.com/a к https://old.com/b\nhttps://old.com/b к https://new.com/c',
      );
      await user.click(screen.getByRole('button', { name: 'Generate redirects' }));

      expect(
        screen.getByText(
          'These redirects pointed to another redirect in the list; the extra hop was skipped:',
        ),
      ).toBeInTheDocument();
      expect(screen.getByText('/a')).toBeInTheDocument();
    });

    it('flags a redirect cycle and excludes it from the output', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByRole('button', { name: 'Toggle settings panel' }));
      await selectOption(user, 'Redirect mode:', 'Individual target per URL');
      await user.click(screen.getByTestId('outside'));

      await user.type(
        screen.getByLabelText('Enter source and target URL pairs, one pair per line'),
        'https://old.com/a к https://old.com/b\nhttps://old.com/b к https://old.com/a',
      );
      await user.click(screen.getByRole('button', { name: 'Generate redirects' }));

      expect(
        screen.getByText('These source URLs form a redirect cycle and were excluded:'),
      ).toBeInTheDocument();
      expect(screen.getByText('/a')).toBeInTheDocument();
      expect(screen.getByText('/b')).toBeInTheDocument();
    });
  });
});
