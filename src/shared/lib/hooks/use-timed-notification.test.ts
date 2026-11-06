import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTimedNotification } from './use-timed-notification';

function advanceTimersBy(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useTimedNotification', () => {
  it('shows the message and clears it automatically after the duration', () => {
    const { result } = renderHook(() => useTimedNotification(1000));

    act(() => result.current.notify('Copied!'));
    expect(result.current.message).toBe('Copied!');

    advanceTimersBy(1000);
    expect(result.current.message).toBe('');
  });

  it('restarts the timer when notified again before the previous one fires', () => {
    const { result } = renderHook(() => useTimedNotification(1000));

    act(() => result.current.notify('first'));
    advanceTimersBy(500);
    act(() => result.current.notify('second'));
    advanceTimersBy(500);

    expect(result.current.message).toBe('second');

    advanceTimersBy(500);
    expect(result.current.message).toBe('');
  });

  it('clear cancels a pending timer and empties the message immediately', () => {
    const { result } = renderHook(() => useTimedNotification(1000));

    act(() => result.current.notify('hello'));
    act(() => result.current.clear());
    expect(result.current.message).toBe('');

    advanceTimersBy(1000);
    expect(result.current.message).toBe('');
  });
});
