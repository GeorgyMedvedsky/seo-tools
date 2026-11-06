import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEscapeKey } from './use-escape-key';

function pressEscape() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
}

function pressKey(key: string) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key }));
}

describe('useEscapeKey', () => {
  it('calls the callback when Escape is pressed while active', () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey(onEscape, true));

    pressEscape();

    expect(onEscape).toHaveBeenCalledOnce();
  });

  it('does not call the callback when inactive', () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey(onEscape, false));

    pressEscape();

    expect(onEscape).not.toHaveBeenCalled();
  });

  it('ignores keys other than Escape', () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey(onEscape, true));

    pressKey('Enter');

    expect(onEscape).not.toHaveBeenCalled();
  });

  it('removes the listener once inactive', () => {
    const onEscape = vi.fn();
    const { rerender } = renderHook(({ active }) => useEscapeKey(onEscape, active), {
      initialProps: { active: true },
    });

    rerender({ active: false });
    pressEscape();

    expect(onEscape).not.toHaveBeenCalled();
  });
});
