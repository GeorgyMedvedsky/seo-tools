import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './select';

const OPTIONS = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry' },
];

function renderSelect(value: string, onChange = vi.fn()) {
  render(<Select id="fruit" label="Fruit:" options={OPTIONS} value={value} onChange={onChange} />);
  return { onChange };
}

describe('Select', () => {
  it('shows the label and the currently selected option text on the trigger, closed by default', () => {
    renderSelect('b');
    const trigger = screen.getByRole('combobox', { name: 'Fruit: Banana' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveTextContent('Banana');
  });

  it('opens the listbox on click and lists every option', async () => {
    const user = userEvent.setup();
    renderSelect('a');
    await user.click(screen.getByRole('combobox'));

    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('selects an option by clicking it, calling onChange with its value and closing the listbox', async () => {
    const user = userEvent.setup();
    const { onChange } = renderSelect('a');
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Cherry' }));

    expect(onChange).toHaveBeenCalledWith('c');
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(screen.getByRole('combobox'));
  });

  it('closes without calling onChange on an outside click', async () => {
    const user = userEvent.setup();
    const { onChange } = renderSelect('a');
    render(<span data-testid="outside" />);
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByTestId('outside'));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on Escape without calling onChange', async () => {
    const user = userEvent.setup();
    const { onChange } = renderSelect('a');
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('{Escape}');

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
  });

  it('moves the active option with ArrowDown/ArrowUp and selects it with Enter', async () => {
    const user = userEvent.setup();
    const { onChange } = renderSelect('a');
    const trigger = screen.getByRole('combobox');
    trigger.focus();

    await user.keyboard('{ArrowDown}');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-activedescendant', 'fruit-option-0');

    await user.keyboard('{ArrowDown}');
    expect(trigger).toHaveAttribute('aria-activedescendant', 'fruit-option-1');

    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('b');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('wraps from the last option back to the first with ArrowDown', async () => {
    const user = userEvent.setup();
    renderSelect('c');
    const trigger = screen.getByRole('combobox');
    trigger.focus();

    await user.keyboard('{ArrowDown}');
    expect(trigger).toHaveAttribute('aria-activedescendant', 'fruit-option-2');
    await user.keyboard('{ArrowDown}');
    expect(trigger).toHaveAttribute('aria-activedescendant', 'fruit-option-0');
  });

  it('jumps to the first and last option with Home/End while open', async () => {
    const user = userEvent.setup();
    renderSelect('a');
    const trigger = screen.getByRole('combobox');
    trigger.focus();
    await user.keyboard('{ArrowDown}');

    await user.keyboard('{End}');
    expect(trigger).toHaveAttribute('aria-activedescendant', 'fruit-option-2');

    await user.keyboard('{Home}');
    expect(trigger).toHaveAttribute('aria-activedescendant', 'fruit-option-0');
  });

  it('closes again on a second click of the trigger', async () => {
    const user = userEvent.setup();
    renderSelect('a');
    const trigger = screen.getByRole('combobox');
    await user.click(trigger);
    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('selects an option immediately via type-ahead while closed (bug-prone edge case)', async () => {
    const user = userEvent.setup();
    const { onChange } = renderSelect('a');
    screen.getByRole('combobox').focus();

    await user.keyboard('c');

    expect(onChange).toHaveBeenCalledWith('c');
  });

  it('only moves the highlighted option via type-ahead while open, without committing', async () => {
    const user = userEvent.setup();
    const { onChange } = renderSelect('a');
    const trigger = screen.getByRole('combobox');
    trigger.focus();
    await user.keyboard('{ArrowDown}');

    await user.keyboard('c');

    expect(onChange).not.toHaveBeenCalled();
    expect(trigger).toHaveAttribute('aria-activedescendant', 'fruit-option-2');
  });
});
