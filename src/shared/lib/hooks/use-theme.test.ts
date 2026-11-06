import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTheme } from './use-theme';

function stubMatchMedia(prefersLight: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: prefersLight }));
}

function stubMatchMediaByQuery(matchers: Record<string, boolean>) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: matchers[query] ?? false })),
  );
}

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document, 'startViewTransition');
});

describe('useTheme', () => {
  it('falls back to the system preference when nothing is stored', () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('defaults to dark when the system has no light preference', () => {
    stubMatchMedia(false);
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('dark');
  });

  it('prefers a stored theme over the system preference', () => {
    stubMatchMedia(false);
    localStorage.setItem('theme', 'light');
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');
  });

  it('toggles the theme, updates the DOM attribute and persists the choice', () => {
    stubMatchMedia(false);
    const { result } = renderHook(() => useTheme());

    act(() => result.current.toggleTheme());

    expect(result.current.theme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');

    act(() => result.current.toggleTheme());

    expect(result.current.theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('uses a view transition to toggle the theme when the API is available', () => {
    stubMatchMedia(false);
    const startViewTransition = vi.fn((callback: () => void) => {
      callback();
      return {
        ready: Promise.resolve(),
        finished: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
        types: new Set<string>(),
        skipTransition: () => {},
      };
    });
    document.startViewTransition = startViewTransition;

    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggleTheme());

    expect(startViewTransition).toHaveBeenCalledOnce();
    expect(result.current.theme).toBe('light');
  });

  it('skips the view transition and toggles instantly when the user prefers reduced motion', () => {
    stubMatchMediaByQuery({
      '(prefers-color-scheme: light)': false,
      '(prefers-reduced-motion: reduce)': true,
    });
    const startViewTransition = vi.fn();
    document.startViewTransition = startViewTransition;

    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggleTheme());

    expect(startViewTransition).not.toHaveBeenCalled();
    expect(result.current.theme).toBe('light');
  });
});
