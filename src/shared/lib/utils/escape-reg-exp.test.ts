import { describe, expect, it } from 'vitest';
import { escapeRegExp } from './escape-reg-exp';

describe('escapeRegExp', () => {
  it('escapes every regex special character', () => {
    const input = '.*+?^${}()|[]\\';
    const expected = '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\';
    expect(escapeRegExp(input)).toBe(expected);
  });

  it('leaves ordinary characters untouched', () => {
    expect(escapeRegExp('/path/to-page_1')).toBe('/path/to-page_1');
  });

  it('the escaped output is safe to embed in a RegExp', () => {
    const path = '/a.b[c]/d';
    const pattern = new RegExp(`^${escapeRegExp(path)}$`);
    expect(pattern.test(path)).toBe(true);
    expect(pattern.test('/aXb[c]/d')).toBe(false);
  });
});
