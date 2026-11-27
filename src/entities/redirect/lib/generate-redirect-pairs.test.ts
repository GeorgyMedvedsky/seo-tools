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
        merge: true,
      });
      expect(result).toEqual({
        ok: true,
        output:
          'location ~* ^/a/?$ {\n  return 301 https://new.com/a-new;\n}\n' +
          'location ~* ^/b/?$ {\n  return 301 https://new.com/b-new;\n}',
        unparseableLines: [],
        conflictingSources: [],
        redirectCycles: [],
        collapsedChains: [],
        hasRedirects: true,
      });
    });

    it('parses two URLs regardless of the separator between them', () => {
      const tab = 'https://old.com/a\thttps://new.com/a-new';
      const arrow = 'https://old.com/b -> https://new.com/b-new';
      const space = 'https://old.com/c https://new.com/c-new';

      const result = generateRedirectPairs({
        lines: [tab, arrow, space],
        template: 'nginx',
        merge: true,
      });
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
        merge: true,
      });
      expect(result.output).toBe('RedirectMatch 301 "(?i)^/a/?$" "https://new.com/a-new"');
    });

    it('falls back to RewriteRule + QSD + NC when the target has its own query string', () => {
      const result = generateRedirectPairs({
        lines: ['https://old.com/a к https://new.com/target?utm=1'],
        template: 'apache',
        merge: true,
      });
      expect(result.output).toBe(
        'RewriteRule "^/a/?$" "https://new.com/target?utm=1" [R=301,L,QSD,NC]',
      );
    });
  });

  describe('malformed lines', () => {
    it('collects a line with only one URL as unparseable', () => {
      const result = generateRedirectPairs({
        lines: ['https://old.com/a only one url here'],
        template: 'nginx',
        merge: true,
      });
      expect(result.unparseableLines).toEqual(['https://old.com/a only one url here']);
      expect(result.hasRedirects).toBe(false);
    });

    it('collects a line with three URLs as unparseable', () => {
      const result = generateRedirectPairs({
        lines: ['https://a.com/ https://b.com/ https://c.com/'],
        template: 'nginx',
        merge: true,
      });
      expect(result.unparseableLines).toHaveLength(1);
    });

    it('collects a line where one of the two URLs is invalid', () => {
      const result = generateRedirectPairs({
        lines: ['https://old.com/a к not-a-valid-url://[['],
        template: 'nginx',
        merge: true,
      });
      expect(result.unparseableLines).toHaveLength(1);
    });

    it('skips blank lines without treating them as unparseable', () => {
      const result = generateRedirectPairs({
        lines: ['', '   ', 'https://old.com/a к https://new.com/a-new'],
        template: 'nginx',
        merge: true,
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
        merge: true,
      });
      expect(result.output).toBe('');
      expect(result.hasRedirects).toBe(false);
      expect(result.conflictingSources).toEqual([]);
    });

    it('merges different source paths mapped to the identical target into one alternation rule', () => {
      const result = generateRedirectPairs({
        lines: [
          'https://old.com/page-one к https://new.com/other-page',
          'https://old.com/page-two к https://new.com/other-page',
          'https://old.com/page-three к https://new.com/other-page',
        ],
        template: 'nginx',
        merge: true,
      });
      expect(result.output).toBe(
        'location ~* ^(/page-one/?|/page-two/?|/page-three/?)$ {\n' +
          '  return 301 https://new.com/other-page;\n}',
      );
    });

    it('merges into an apache RedirectMatch alternation the same way', () => {
      const result = generateRedirectPairs({
        lines: [
          'https://old.com/a к https://new.com/shared',
          'https://old.com/b к https://new.com/shared',
        ],
        template: 'apache',
        merge: true,
      });
      expect(result.output).toBe('RedirectMatch 301 "(?i)^(/a/?|/b/?)$" "https://new.com/shared"');
    });

    it('does not merge paths that map to different targets', () => {
      const result = generateRedirectPairs({
        lines: [
          'https://old.com/a к https://new.com/one',
          'https://old.com/b к https://new.com/two',
        ],
        template: 'nginx',
        merge: true,
      });
      expect(result.output).toBe(
        'location ~* ^/a/?$ {\n  return 301 https://new.com/one;\n}\n' +
          'location ~* ^/b/?$ {\n  return 301 https://new.com/two;\n}',
      );
    });

    it('deduplicates the same source path mapped twice to the same target', () => {
      const result = generateRedirectPairs({
        lines: [
          'https://old.com/a к https://new.com/target',
          'https://old.com/a к https://new.com/target',
        ],
        template: 'nginx',
        merge: true,
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
        merge: true,
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
        merge: true,
      });
      expect(result.conflictingSources).toEqual(['/a']);
      expect(result.output).toBe('location ~* ^/b/?$ {\n  return 301 https://new.com/valid;\n}');
      expect(result.hasRedirects).toBe(true);
    });
  });

  describe('merge toggle', () => {
    it('generates a separate nginx location block per path sharing a target when merge is disabled', () => {
      const result = generateRedirectPairs({
        lines: [
          'https://old.com/a к https://new.com/shared',
          'https://old.com/b к https://new.com/shared',
        ],
        template: 'nginx',
        merge: false,
      });
      expect(result.output).toBe(
        'location ~* ^/a/?$ {\n  return 301 https://new.com/shared;\n}\n' +
          'location ~* ^/b/?$ {\n  return 301 https://new.com/shared;\n}',
      );
    });

    it('generates a separate apache RedirectMatch per path sharing a target when merge is disabled', () => {
      const result = generateRedirectPairs({
        lines: [
          'https://old.com/a к https://new.com/shared',
          'https://old.com/b к https://new.com/shared',
        ],
        template: 'apache',
        merge: false,
      });
      expect(result.output).toBe(
        'RedirectMatch 301 "(?i)^/a/?$" "https://new.com/shared"\n' +
          'RedirectMatch 301 "(?i)^/b/?$" "https://new.com/shared"',
      );
    });

    it('generates a separate apache RewriteRule per path when the shared target has its own query and merge is disabled', () => {
      const result = generateRedirectPairs({
        lines: [
          'https://old.com/a к https://new.com/shared?utm=1',
          'https://old.com/b к https://new.com/shared?utm=1',
        ],
        template: 'apache',
        merge: false,
      });
      expect(result.output).toBe(
        'RewriteRule "^/a/?$" "https://new.com/shared?utm=1" [R=301,L,QSD,NC]\n' +
          'RewriteRule "^/b/?$" "https://new.com/shared?utm=1" [R=301,L,QSD,NC]',
      );
    });
  });

  it('escapes regex special characters in the source path', () => {
    const result = generateRedirectPairs({
      lines: ['https://old.com/a.b[c]d к https://new.com/target'],
      template: 'nginx',
      merge: true,
    });
    expect(result.output).toContain('^/a\\.b\\[c\\]d/?$');
  });

  describe('config injection safety', () => {
    it('treats a line as unparseable when the target contains a literal semicolon', () => {
      const result = generateRedirectPairs({
        lines: ['https://old.com/a к https://new.com/target;evil'],
        template: 'nginx',
        merge: true,
      });
      expect(result.unparseableLines).toHaveLength(1);
      expect(result.output).toBe('');
    });

    it('treats a line as unparseable when the target contains a literal double quote', () => {
      const result = generateRedirectPairs({
        lines: ['https://old.com/a к https://new.com/target" Require all granted #'],
        template: 'apache',
        merge: true,
      });
      expect(result.unparseableLines).toHaveLength(1);
      expect(result.output).toBe('');
    });

    it('treats a line as unparseable when the source path decodes into one containing a semicolon (bug: naive pre-decode check would miss this)', () => {
      const result = generateRedirectPairs({
        lines: ['https://old.com/a%3Breturn%20301%20https://evil.com к https://new.com/target'],
        template: 'nginx',
        merge: true,
      });
      expect(result.unparseableLines).toHaveLength(1);
      expect(result.output).toBe('');
    });
  });

  describe('trailing slash normalization', () => {
    it('treats /page and /page/ as the same source, deduplicating when they share a target', () => {
      const result = generateRedirectPairs({
        lines: [
          'https://old.com/a к https://new.com/target',
          'https://old.com/a/ к https://new.com/target',
        ],
        template: 'nginx',
        merge: true,
      });
      expect(result.output.match(/location/g)).toHaveLength(1);
      expect(result.output).toBe('location ~* ^/a/?$ {\n  return 301 https://new.com/target;\n}');
      expect(result.conflictingSources).toEqual([]);
    });

    it('flags /page and /page/ mapped to different targets as a conflict, not two independent rules', () => {
      const result = generateRedirectPairs({
        lines: [
          'https://old.com/a к https://new.com/one',
          'https://old.com/a/ к https://new.com/two',
        ],
        template: 'nginx',
        merge: true,
      });
      expect(result.conflictingSources).toEqual(['/a']);
      expect(result.output).toBe('');
    });

    it('follows a chain when the intermediate target has a trailing slash the source does not', () => {
      const result = generateRedirectPairs({
        lines: ['https://old.com/a к https://old.com/b/', 'https://old.com/b к https://new.com/c'],
        template: 'nginx',
        merge: true,
      });
      expect(result.output).toBe('location ~* ^(/a/?|/b/?)$ {\n  return 301 https://new.com/c;\n}');
      expect(result.collapsedChains).toEqual(['/a']);
    });

    it('does not alter the target URL itself, trailing slash included', () => {
      const result = generateRedirectPairs({
        lines: ['https://old.com/a к https://new.com/target/'],
        template: 'nginx',
        merge: true,
      });
      expect(result.output).toBe('location ~* ^/a/?$ {\n  return 301 https://new.com/target/;\n}');
    });
  });

  describe('redirect chains', () => {
    it('collapses a single-hop chain (A -> B -> C) into a direct A -> C rule, keeping B -> C as its own rule', () => {
      const result = generateRedirectPairs({
        lines: ['https://old.com/a к https://old.com/b', 'https://old.com/b к https://new.com/c'],
        template: 'nginx',
        merge: true,
      });
      expect(result.output).toBe('location ~* ^(/a/?|/b/?)$ {\n  return 301 https://new.com/c;\n}');
      expect(result.collapsedChains).toEqual(['/a']);
      expect(result.redirectCycles).toEqual([]);
    });

    it('follows an arbitrarily deep chain to its final destination', () => {
      const result = generateRedirectPairs({
        lines: [
          'https://old.com/a к https://old.com/b',
          'https://old.com/b к https://old.com/c',
          'https://old.com/c к https://new.com/final',
        ],
        template: 'nginx',
        merge: true,
      });
      expect(result.output).toBe(
        'location ~* ^(/a/?|/b/?|/c/?)$ {\n  return 301 https://new.com/final;\n}',
      );
      expect(result.collapsedChains.sort()).toEqual(['/a', '/b']);
    });

    it('flags every path in a cycle as a redirect cycle and excludes them from the output', () => {
      const result = generateRedirectPairs({
        lines: ['https://old.com/a к https://old.com/b', 'https://old.com/b к https://old.com/a'],
        template: 'nginx',
        merge: true,
      });
      expect(result.output).toBe('');
      expect(result.hasRedirects).toBe(false);
      expect(result.redirectCycles.sort()).toEqual(['/a', '/b']);
      expect(result.collapsedChains).toEqual([]);
    });

    it('flags a longer cycle (A -> B -> C -> A) entirely', () => {
      const result = generateRedirectPairs({
        lines: [
          'https://old.com/a к https://old.com/b',
          'https://old.com/b к https://old.com/c',
          'https://old.com/c к https://old.com/a',
        ],
        template: 'nginx',
        merge: true,
      });
      expect(result.output).toBe('');
      expect(result.redirectCycles.sort()).toEqual(['/a', '/b', '/c']);
    });

    it('does not chain through a path that is itself a conflicting source, leaving the direct target as-is', () => {
      const result = generateRedirectPairs({
        lines: [
          'https://old.com/a к https://old.com/b',
          'https://old.com/b к https://new.com/one',
          'https://old.com/b к https://new.com/two',
        ],
        template: 'nginx',
        merge: true,
      });
      expect(result.conflictingSources).toEqual(['/b']);
      expect(result.output).toBe('location ~* ^/a/?$ {\n  return 301 https://old.com/b;\n}');
      expect(result.collapsedChains).toEqual([]);
    });

    it('does not flag a false cycle when a target path on a different (external) host merely happens to match a source path (bug fix)', () => {
      const result = generateRedirectPairs({
        lines: [
          'https://old.com/ к https://new.com/',
          'https://old.com/bets/ к https://new.com/',
          'https://old.com/bonuses/ к https://new.com/bonuses',
        ],
        template: 'nginx',
        merge: true,
      });
      expect(result.redirectCycles).toEqual([]);
      expect(result.collapsedChains).toEqual([]);
      expect(result.output).toBe(
        'location ~* ^(//?|/bets/?)$ {\n  return 301 https://new.com/;\n}\n' +
          'location ~* ^/bonuses/?$ {\n  return 301 https://new.com/bonuses;\n}',
      );
    });

    it('still detects a real cycle that happens to involve the root path on the same host', () => {
      const result = generateRedirectPairs({
        lines: [
          'https://old.com/ к https://old.com/moved',
          'https://old.com/moved к https://old.com/',
        ],
        template: 'nginx',
        merge: true,
      });
      expect(result.redirectCycles.sort()).toEqual(['/', '/moved']);
      expect(result.output).toBe('');
    });
  });

  it('reports no redirects when nothing valid is left after filtering', () => {
    const result = generateRedirectPairs({
      lines: ['not a url at all'],
      template: 'nginx',
      merge: true,
    });
    expect(result.hasRedirects).toBe(false);
  });
});
