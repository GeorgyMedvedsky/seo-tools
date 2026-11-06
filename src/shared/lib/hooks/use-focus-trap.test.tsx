import { useRef } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useFocusTrap } from './use-focus-trap';

function fireTab(element: HTMLElement, shiftKey = false) {
  element.focus();
  element.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true }),
  );
}

function TestPanel({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, active);

  return (
    <div>
      <button type="button">outside-before</button>
      <div ref={ref}>
        <button type="button">first</button>
        <button type="button">second</button>
        <button type="button">last</button>
      </div>
      <button type="button">outside-after</button>
    </div>
  );
}

function EmptyTrapPanel({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, active);

  return <div ref={ref} data-testid="empty-trap" />;
}

describe('useFocusTrap', () => {
  it('moves focus to the first focusable element when activated', () => {
    render(<TestPanel active={true} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'first' }));
  });

  it('does nothing when inactive', () => {
    render(<TestPanel active={false} />);
    expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'first' }));
  });

  it('wraps Tab from the last focusable element back to the first', () => {
    render(<TestPanel active={true} />);
    fireTab(screen.getByRole('button', { name: 'last' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'first' }));
  });

  it('wraps Shift+Tab from the first focusable element back to the last', () => {
    render(<TestPanel active={true} />);
    fireTab(screen.getByRole('button', { name: 'first' }), true);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'last' }));
  });

  it('does not interfere with Tab in the middle of the trap', () => {
    render(<TestPanel active={true} />);
    fireTab(screen.getByRole('button', { name: 'second' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'second' }));
  });

  it('restores focus to the previously focused element on deactivation', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'trigger';
    document.body.appendChild(trigger);
    trigger.focus();

    const { rerender } = render(<TestPanel active={true} />);
    expect(document.activeElement).not.toBe(trigger);

    rerender(<TestPanel active={false} />);
    expect(document.activeElement).toBe(trigger);

    trigger.remove();
  });

  it('does not throw when activated with no focusable elements in the container', () => {
    expect(() => render(<EmptyTrapPanel active={true} />)).not.toThrow();
  });

  it('does not throw on Tab when there is nothing focusable to wrap between', () => {
    render(<EmptyTrapPanel active={true} />);
    expect(() => fireTab(screen.getByTestId('empty-trap'))).not.toThrow();
  });
});
