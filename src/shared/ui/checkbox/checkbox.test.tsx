import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './checkbox';

describe('Checkbox', () => {
  it('associates the label text with the input', () => {
    render(<Checkbox id="group" label="Group" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Group')).toBeInstanceOf(HTMLInputElement);
  });

  it('toggles when the label text is clicked', async () => {
    const user = userEvent.setup();
    render(<Checkbox id="group" label="Group" onChange={vi.fn()} />);

    await user.click(screen.getByText('Group'));

    expect(screen.getByLabelText('Group')).toBeChecked();
  });

  it('does not toggle when the empty space around the label/input is clicked (bug fix: no more full-row invisible button)', async () => {
    const user = userEvent.setup();
    render(<Checkbox id="group" label="Group" onChange={vi.fn()} />);

    const row = screen.getByText('Group').closest('div');
    if (!row) throw new Error('row wrapper not found');
    await user.click(row);

    expect(screen.getByLabelText('Group')).not.toBeChecked();
  });
});
