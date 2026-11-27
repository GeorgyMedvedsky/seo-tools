import { describe, expect, it } from 'vitest';
import { generateRedirectPairs } from './generate-redirect-pairs';

describe('generateRedirectPairs', () => {
  describe('nginx', () => {
    it('generates a location block per distinct target', () => {
      const result = generateRedirectPairs({
        lines: [
          'https://old.com/a к https://new.com/a-new',
          'https://old.com/b to https://new.com/b-new',
        ],
        template: 'nginx',
      });
      expect(result).toEqual({
        ok: true,
        output:
          'location ~* ^/a$ {\n  return 301 https://new.com/a-new;\n}\n' +
          'location ~* ^/b$ {\n  return 301 https://new.com/b-new;\n}',
        unparseableLines: [],
        conflictingSources: [],
        hasRedirects: true,
      });
    });

    it('parses two URLs regardless of the separator between them', () => {
      const tab = 'https://old.com/a\thttps://new.com/a-new';
      const arrow = 'https://old.com/b -> https://new.com/b-new';
      const space = 'https://old.com/c https://new.com/c-new';

      const result = generateRedirectPairs({ lines: [tab, arrow, space], template: 'nginx' });
      expect(result.unparseableLines).toEqual([]);
      expect(result.hasRedirects).toBe(true);
      expect(result.output.match(/location/g)).toHaveLength(3);
    });
  });

  describe('apache', () => {
    it('generates a RedirectMatch per pair when the target has no query of its own', () => {
      const result = generateRedirectPairs({
        lines: ['https://old.com/a к https://new.com/a-new'],
        template: 'apache',
      });
      expect(result.output).toBe('RedirectMatch 301 "(?i)^/a$" "https://new.com/a-new"');
    });

    it('falls back to RewriteRule + QSD + NC when the target has its own query string', () => {
      const result = generateRedirectPairs({
        lines: ['https://old.com/a к https://new.com/target?utm=1'],
        template: 'apache',
      });
      expect(result.output).toBe(
        'RewriteRule "^/a$" "https://new.com/target?utm=1" [R=301,L,QSD,NC]',
      );
    });
  });

  describe('malformed lines', () => {
    it('collects a line with only one URL as unparseable', () => {
      const result = generateRedirectPairs({
        lines: ['https://old.com/a only one url here'],
        template: 'nginx',
      });
      expect(result.unparseableLines).toEqual(['https://old.com/a only one url here']);
      expect(result.hasRedirects).toBe(false);
    });

    it('collects a line with three URLs as unparseable', () => {
      const result = generateRedirectPairs({
        lines: ['https://a.com/ https://b.com/ https://c.com/'],
        template: 'nginx',
      });
      expect(result.unparseableLines).toHaveLength(1);
    });

    it('collects a line where one of the two URLs is invalid', () => {
      const result = generateRedirectPairs({
        lines: ['https://old.com/a к not-a-valid-url://[['],
        template: 'nginx',
      });
      expect(result.unparseableLines).toHaveLength(1);
    });

    it('skips blank lines without treating them as unparseable', () => {
      const result = generateRedirectPairs({
        lines: ['', '   ', 'https://old.com/a к https://new.com/a-new'],
        template: 'nginx',
      });
      expect(result.unparseableLines).toEqual([]);
      expect(result.hasRedirects).toBe(true);
    });
  });

  describe('no-op and duplicate sources', () => {
    it('silently skips a pair whose source and target are identical', () => {
      const result = generateRedirectPairs({
        lines: ['https://old.com/a к https://old.com/a'],
        template: 'nginx',
      });
      expect(result.output).toBe('');
      expect(result.hasRedirects).toBe(false);
      expect(result.conflictingSources).toEqual([]);
    });

    it('merges different source paths mapped to the identical target into one alternation rule', () => {
      const result = generateRedirectPairs({
        lines: [
          'https://old.com/deposit-paymaya к https://new.com/deposit-and-withdrawals',
          'https://old.com/deposit-gcash к https://new.com/deposit-and-withdrawals',
          'https://old.com/deposit-coins-ph к https://new.com/deposit-and-withdrawals',
        ],
        template: 'nginx',
      });
      expect(result.output).toBe(
        'location ~* ^(/deposit-paymaya|/deposit-gcash|/deposit-coins-ph)$ {\n' +
          '  return 301 https://new.com/deposit-and-withdrawals;\n}',
      );
    });

    it('merges into an apache RedirectMatch alternation the same way', () => {
      const result = generateRedirectPairs({
        lines: [
          'https://old.com/a к https://new.com/shared',
          'https://old.com/b к https://new.com/shared',
        ],
        template: 'apache',
      });
      expect(result.output).toBe('RedirectMatch 301 "(?i)^(/a|/b)$" "https://new.com/shared"');
    });

    it('does not merge paths that map to different targets', () => {
      const result = generateRedirectPairs({
        lines: [
          'https://old.com/a к https://new.com/one',
          'https://old.com/b к https://new.com/two',
        ],
        template: 'nginx',
      });
      expect(result.output).toBe(
        'location ~* ^/a$ {\n  return 301 https://new.com/one;\n}\n' +
          'location ~* ^/b$ {\n  return 301 https://new.com/two;\n}',
      );
    });

    it('deduplicates the same source path mapped twice to the same target', () => {
      const result = generateRedirectPairs({
        lines: [
          'https://old.com/a к https://new.com/target',
          'https://old.com/a к https://new.com/target',
        ],
        template: 'nginx',
      });
      expect(result.output.match(/location/g)).toHaveLength(1);
      expect(result.conflictingSources).toEqual([]);
    });

    it('flags the same source path mapped to two different targets as a conflict, excluding it from the output', () => {
      const result = generateRedirectPairs({
        lines: [
          'https://old.com/a к https://new.com/one',
          'https://old.com/a к https://new.com/two',
        ],
        template: 'nginx',
      });
      expect(result.conflictingSources).toEqual(['/a']);
      expect(result.output).toBe('');
      expect(result.hasRedirects).toBe(false);
    });

    it('still generates a rule for valid pairs alongside a conflicting one, instead of discarding everything', () => {
      const result = generateRedirectPairs({
        lines: [
          'https://old.com/a к https://new.com/one',
          'https://old.com/a к https://new.com/two',
          'https://old.com/b к https://new.com/valid',
        ],
        template: 'nginx',
      });
      expect(result.conflictingSources).toEqual(['/a']);
      expect(result.output).toBe(
        'location ~* ^/b$ {\n  return 301 https://new.com/valid;\n}',
      );
      expect(result.hasRedirects).toBe(true);
    });
  });

  it('escapes regex special characters in the source path', () => {
    const result = generateRedirectPairs({
      lines: ['https://old.com/a.b[c]d к https://new.com/target'],
      template: 'nginx',
    });
    expect(result.output).toContain('^/a\\.b\\[c\\]d$');
  });

  describe('config injection safety', () => {
    it('treats a line as unparseable when the target contains a literal semicolon', () => {
      const result = generateRedirectPairs({
        lines: ['https://old.com/a к https://new.com/target;evil'],
        template: 'nginx',
      });
      expect(result.unparseableLines).toHaveLength(1);
      expect(result.output).toBe('');
    });

    it('treats a line as unparseable when the target contains a literal double quote', () => {
      const result = generateRedirectPairs({
        lines: ['https://old.com/a к https://new.com/target" Require all granted #'],
        template: 'apache',
      });
      expect(result.unparseableLines).toHaveLength(1);
      expect(result.output).toBe('');
    });

    it('treats a line as unparseable when the source path decodes into one containing a semicolon (bug: naive pre-decode check would miss this)', () => {
      const result = generateRedirectPairs({
        lines: [
          'https://old.com/a%3Breturn%20301%20https://evil.com к https://new.com/target',
        ],
        template: 'nginx',
      });
      expect(result.unparseableLines).toHaveLength(1);
      expect(result.output).toBe('');
    });
  });

  it('reports no redirects when nothing valid is left after filtering', () => {
    const result = generateRedirectPairs({
      lines: ['not a url at all'],
      template: 'nginx',
    });
    expect(result.hasRedirects).toBe(false);
  });
});
