import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InfoPopover } from './info-popover';

describe('InfoPopover', () => {
  it('is closed by default and opens on trigger click', async () => {
    const user = userEvent.setup();
    render(
      <InfoPopover label="How to use this file">
        <p>Some help text</p>
      </InfoPopover>,
    );

    const trigger = screen.getByRole('button', { name: 'How to use this file' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Some help text').closest('[inert]')).toBeInTheDocument();

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Some help text').closest('[inert]')).not.toBeInTheDocument();
  });

  it('closes again when the trigger is clicked a second time', async () => {
    const user = userEvent.setup();
    render(
      <InfoPopover label="How to use this file">
        <p>Some help text</p>
      </InfoPopover>,
    );

    const trigger = screen.getByRole('button', { name: 'How to use this file' });
    await user.click(trigger);
    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    render(
      <InfoPopover label="How to use this file">
        <p>Some help text</p>
      </InfoPopover>,
    );

    await user.click(screen.getByRole('button', { name: 'How to use this file' }));
    await user.keyboard('{Escape}');

    expect(screen.getByRole('button', { name: 'How to use this file' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('closes on an outside click', async () => {
    const user = userEvent.setup();
    render(
      <>
        <span data-testid="outside" />
        <InfoPopover label="How to use this file">
          <p>Some help text</p>
        </InfoPopover>
      </>,
    );

    await user.click(screen.getByRole('button', { name: 'How to use this file' }));
    await user.click(screen.getByTestId('outside'));

    expect(screen.getByRole('button', { name: 'How to use this file' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
