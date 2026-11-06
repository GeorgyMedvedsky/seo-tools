import { describe, expect, it } from 'vitest';
import { generatorReducer, initialState } from './reducer';
import type { GeneratorState } from './types';

const withTarget = (targetUrl: string, urlsInput = ''): GeneratorState => ({
  ...initialState,
  targetUrl,
  urlsInput,
});

describe('generatorReducer', () => {
  it('reports a distinct "required" error for an empty target URL', () => {
    const state = generatorReducer(withTarget('   '), { type: 'generate' });
    expect(state.targetUrlError).toBe('required');
    expect(state.output).toBe('');
  });

  it('reports a distinct "invalid" error for a malformed target URL, not a generic failure', () => {
    const state = generatorReducer(withTarget('not-a-url', 'https://example.com/a'), {
      type: 'generate',
    });
    expect(state.targetUrlError).toBe('invalid');
    expect(state.output).toBe('');
  });

  it('populates output and opens the warning/error panels based on the result', () => {
    const state = generatorReducer(
      withTarget('https://example.com/target', 'https://other.com/a\nnot a url'),
      { type: 'generate' },
    );
    expect(state.targetUrlError).toBeNull();
    expect(state.output).not.toBe('');
    expect(state.subdomains).toEqual(['other.com']);
    expect(state.unparseableUrls).toEqual(['not a url']);
    expect(state.warningPanelOpen).toBe(true);
    expect(state.errorPanelOpen).toBe(true);
  });

  it('reports nothingToRedirect when the URL list is empty', () => {
    const state = generatorReducer(withTarget('https://example.com/target', ''), {
      type: 'generate',
    });
    expect(state.nothingToRedirect).toBe(true);
    expect(state.targetUrlError).toBeNull();
  });

  it('reports nothingToRedirect when every URL was filtered out (excluded paths only)', () => {
    const state = generatorReducer(
      withTarget(
        'https://example.com/target',
        'https://example.com/\nhttps://example.com/robots.txt',
      ),
      { type: 'generate' },
    );
    expect(state.nothingToRedirect).toBe(true);
  });

  it('clears nothingToRedirect once the URL list is edited again', () => {
    const empty = generatorReducer(withTarget('https://example.com/target', ''), {
      type: 'generate',
    });
    expect(empty.nothingToRedirect).toBe(true);

    const edited = generatorReducer(empty, {
      type: 'urlsInput/change',
      payload: 'https://example.com/a',
    });
    expect(edited.nothingToRedirect).toBe(false);
  });

  it('does not leak stale subdomains/errors into a clean regeneration (bug fix)', () => {
    const first = generatorReducer(
      withTarget('https://example.com/target', 'https://other.com/a'),
      {
        type: 'generate',
      },
    );
    expect(first.subdomains).toEqual(['other.com']);

    const second = generatorReducer(
      { ...first, urlsInput: 'https://example.com/a' },
      { type: 'generate' },
    );
    expect(second.subdomains).toEqual([]);
    expect(second.warningPanelOpen).toBe(false);
  });

  it('reset returns to the initial state', () => {
    const generated = generatorReducer(
      withTarget('https://example.com/target', 'https://example.com/a'),
      {
        type: 'generate',
      },
    );
    expect(generatorReducer(generated, { type: 'reset' })).toEqual(initialState);
  });

  it('closing a panel only affects that panel', () => {
    const generated = generatorReducer(
      withTarget('https://example.com/target', 'https://other.com/a'),
      {
        type: 'generate',
      },
    );
    const closed = generatorReducer(generated, { type: 'warningPanel/close' });
    expect(closed.warningPanelOpen).toBe(false);
    expect(closed.subdomains).toEqual(['other.com']);
  });

  it('changing the target URL clears a previous error', () => {
    const errored = generatorReducer(withTarget('not-a-url', 'https://example.com/a'), {
      type: 'generate',
    });
    expect(errored.targetUrlError).toBe('invalid');
    const edited = generatorReducer(errored, {
      type: 'targetUrl/change',
      payload: 'https://example.com/target',
    });
    expect(edited.targetUrlError).toBeNull();
  });

  it('updates the template', () => {
    const state = generatorReducer(initialState, { type: 'template/change', payload: 'apache' });
    expect(state.template).toBe('apache');
  });

  it('updates the grouped flag', () => {
    const state = generatorReducer(initialState, { type: 'grouped/change', payload: true });
    expect(state.grouped).toBe(true);
  });

  it('closes only the error panel, leaving the warning panel untouched', () => {
    const generated = generatorReducer(
      withTarget('https://example.com/target', 'https://other.com/a\nnot a url'),
      { type: 'generate' },
    );
    const closed = generatorReducer(generated, { type: 'errorPanel/close' });
    expect(closed.errorPanelOpen).toBe(false);
    expect(closed.warningPanelOpen).toBe(true);
  });

  it('returns the current state unchanged for an unknown action', () => {
    const unknownAction = { type: 'unknown/action' } as unknown as Parameters<
      typeof generatorReducer
    >[1];
    expect(generatorReducer(initialState, unknownAction)).toBe(initialState);
  });
});
