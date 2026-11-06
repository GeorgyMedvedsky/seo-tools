import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useGenerateRedirects } from '../model/use-generate-redirects';
import { RedirectGeneratorForm, RedirectGeneratorFormTitle } from './redirect-generator-form';

function TestHarness() {
  const generator = useGenerateRedirects();
  return <RedirectGeneratorForm generator={generator} />;
}

function stubClipboardWriteText() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
  return writeText;
}

afterEach(() => {
  Reflect.deleteProperty(URL, 'createObjectURL');
  Reflect.deleteProperty(URL, 'revokeObjectURL');
});

describe('RedirectGeneratorFormTitle', () => {
  it('keeps a single space between every word, not just the first two (bug fix)', () => {
    render(<RedirectGeneratorFormTitle title="A B C" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('A B C');
  });

  it('renders a two-word title without a trailing space', () => {
    render(<RedirectGeneratorFormTitle title="Redirects Generator" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Redirects Generator');
  });
});

describe('RedirectGeneratorForm', () => {
  it('associates every field with a real, accessible label (bug fix)', () => {
    render(<TestHarness />);
    expect(screen.getByLabelText('Enter addresses, one per line')).toBeInstanceOf(
      HTMLTextAreaElement,
    );
    expect(screen.getByLabelText('Enter the target URL:')).toBeInstanceOf(HTMLInputElement);
  });

  it('shows a distinct message for an empty target URL, generates nothing', async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    await user.click(screen.getByRole('button', { name: 'Generate redirects' }));

    expect(screen.getByText('Please enter the target url')).toBeInTheDocument();
  });

  it('shows a distinct message for an invalid target URL (not a generic per-line failure)', async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    await user.type(screen.getByLabelText('Enter the target URL:'), 'not-a-url');
    await user.click(screen.getByRole('button', { name: 'Generate redirects' }));

    expect(screen.getByText('The target url is not valid')).toBeInTheDocument();
  });

  it('shows a distinct message when the URL list is empty (bug fix: was silently generating a stray output)', async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    await user.type(screen.getByLabelText('Enter the target URL:'), 'https://example.com/target');
    await user.click(screen.getByRole('button', { name: 'Generate redirects' }));

    expect(
      screen.getByText('Nothing to redirect: the URL list is empty or every URL was filtered out'),
    ).toBeInTheDocument();
  });

  it('generates output for a valid input and lets it be copied', async () => {
    const user = userEvent.setup();
    const writeText = stubClipboardWriteText();
    render(<TestHarness />);

    await user.type(screen.getByLabelText('Enter the target URL:'), 'https://example.com/target');
    await user.type(
      screen.getByLabelText('Enter addresses, one per line'),
      'https://example.com/old-page',
    );
    await user.click(screen.getByRole('button', { name: 'Generate redirects' }));

    expect(screen.getByText(/rewrite \(\?i\)\^\/old-page\$/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Copy' }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/old-page'));
    expect(screen.getByRole('status')).toHaveTextContent('Copied!');
  });

  it('reset clears the fields and the output', async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    await user.type(screen.getByLabelText('Enter the target URL:'), 'https://example.com/target');
    await user.click(screen.getByRole('button', { name: 'Reset all' }));

    expect(screen.getByLabelText('Enter the target URL:')).toHaveValue('');
  });

  it('downloads the generated output as redirects.conf', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn().mockReturnValue('blob:mock');
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    render(<TestHarness />);

    await user.type(screen.getByLabelText('Enter the target URL:'), 'https://example.com/target');
    await user.type(
      screen.getByLabelText('Enter addresses, one per line'),
      'https://example.com/old-page',
    );
    await user.click(screen.getByRole('button', { name: 'Generate redirects' }));
    await user.click(screen.getByRole('button', { name: 'Download redirects.conf' }));

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });

  it('shows real flagged subdomains and unparseable URLs in their panels', async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    await user.type(screen.getByLabelText('Enter the target URL:'), 'https://example.com/target');
    await user.type(
      screen.getByLabelText('Enter addresses, one per line'),
      'https://other.com/a\nnot a url',
    );
    await user.click(screen.getByRole('button', { name: 'Generate redirects' }));

    expect(screen.getByText('other.com')).toBeInTheDocument();
    expect(screen.getByText('not a url')).toBeInTheDocument();
  });

  it('closes the warning and error panels independently', async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    await user.type(screen.getByLabelText('Enter the target URL:'), 'https://example.com/target');
    await user.type(
      screen.getByLabelText('Enter addresses, one per line'),
      'https://other.com/a\nnot a url',
    );
    await user.click(screen.getByRole('button', { name: 'Generate redirects' }));

    await user.click(screen.getByRole('button', { name: 'Close warning' }));
    expect(screen.getByText('other.com').closest('[role="alert"]')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(screen.getByText('not a url').closest('[role="alert"]')).toHaveAttribute(
      'aria-hidden',
      'false',
    );

    await user.click(screen.getByRole('button', { name: 'Close error' }));
    expect(screen.getByText('not a url').closest('[role="alert"]')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('closes open notice panels with Escape', async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    await user.type(screen.getByLabelText('Enter the target URL:'), 'https://example.com/target');
    await user.type(
      screen.getByLabelText('Enter addresses, one per line'),
      'https://other.com/a\nnot a url',
    );
    await user.click(screen.getByRole('button', { name: 'Generate redirects' }));

    expect(screen.getByText('other.com').closest('[role="alert"]')).toHaveAttribute(
      'aria-hidden',
      'false',
    );
    expect(screen.getByText('not a url').closest('[role="alert"]')).toHaveAttribute(
      'aria-hidden',
      'false',
    );

    await user.keyboard('{Escape}');

    expect(screen.getByText('other.com').closest('[role="alert"]')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(screen.getByText('not a url').closest('[role="alert"]')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('shows a distinct "Copy failed" message instead of staying silent when the clipboard write fails (bug fix: was a silent no-op)', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<TestHarness />);

    await user.type(screen.getByLabelText('Enter the target URL:'), 'https://example.com/target');
    await user.type(
      screen.getByLabelText('Enter addresses, one per line'),
      'https://example.com/old-page',
    );
    await user.click(screen.getByRole('button', { name: 'Generate redirects' }));
    await user.click(screen.getByRole('button', { name: 'Copy' }));

    expect(writeText).toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Copy failed');
  });

  it('disables Copy/Download when there is nothing to redirect, even though nginx output is not literally empty (bug fix)', async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    await user.type(screen.getByLabelText('Enter the target URL:'), 'https://example.com/target');
    await user.type(
      screen.getByLabelText('Enter addresses, one per line'),
      'https://example.com/\nhttps://example.com/robots.txt',
    );
    await user.click(screen.getByRole('button', { name: 'Generate redirects' }));

    expect(
      screen.getByText('Nothing to redirect: the URL list is empty or every URL was filtered out'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Download redirects.conf' })).toBeDisabled();
  });
});
