import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useClipboard } from './use-clipboard';

function stubClipboardWriteText(impl: () => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn(impl) },
    configurable: true,
  });
}

describe('useClipboard', () => {
  it('copies text and reports success', async () => {
    stubClipboardWriteText(() => Promise.resolve());
    const { result } = renderHook(() => useClipboard());

    let ok = false;
    await act(async () => {
      ok = await result.current.copy('hello');
    });

    expect(ok).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('reports failure and sets an error message when the clipboard API rejects', async () => {
    stubClipboardWriteText(() => Promise.reject(new Error('denied')));
    const { result } = renderHook(() => useClipboard());

    let ok = true;
    await act(async () => {
      ok = await result.current.copy('hello');
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBe('denied');
  });

  it('falls back to String() when the clipboard API rejects with a non-Error value', async () => {
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
    stubClipboardWriteText(() => Promise.reject('permission-denied'));
    const { result } = renderHook(() => useClipboard());

    let ok = true;
    await act(async () => {
      ok = await result.current.copy('hello');
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBe('permission-denied');
  });
});
