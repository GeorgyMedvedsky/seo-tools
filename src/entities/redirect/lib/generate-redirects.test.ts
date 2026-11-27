import { describe, expect, it } from 'vitest';
import { generateRedirects } from './generate-redirects';

const targetUrl = 'https://example.com/target';

describe('generateRedirects', () => {
  it('fails upfront with a distinct error for an invalid target URL, without touching the input list', () => {
    const result = generateRedirects({
      urls: ['not a url', 'https://example.com/foo'],
      targetUrl: 'not-a-valid-url',
      template: 'nginx',
      merge: true,
      grouped: false,
    });
    expect(result).toEqual({ ok: false, error: 'invalid-target-url' });
  });

  describe('nginx — path redirects', () => {
    it('generates a single location block for one URL', () => {
      const result = generateRedirects({
        urls: ['https://example.com/old-page'],
        targetUrl,
        template: 'nginx',
        merge: true,
        grouped: false,
      });
      expect(result).toEqual({
        ok: true,
        output:
          'set $target_url_ https://example.com/target;\n\n' +
          'location ~* ^/old-page/?$ {\n  return 301 $target_url_;\n}',
        subdomains: [],
        unparseableUrls: [],
        hasRedirects: true,
      });
    });

    it.each(['/', '/index.php', '/index.html', '/sitemap.xml', '/robots.txt'])(
      'never produces a rule for excluded path %s',
      (path) => {
        const result = generateRedirects({
          urls: [`https://example.com${path}`],
          targetUrl,
          template: 'nginx',
          merge: true,
          grouped: false,
        });
        expect(result.ok && result.output).toBe('set $target_url_ https://example.com/target;\n\n');
        expect(result.ok && result.hasRedirects).toBe(false);
      },
    );

    it('also excludes a trailing-slash variant of an excluded path (bug fix: normalization applies before the exclusion check)', () => {
      const result = generateRedirects({
        urls: ['https://example.com/index.php/'],
        targetUrl,
        template: 'nginx',
        merge: true,
        grouped: false,
      });
      expect(result.ok && result.output).toBe('set $target_url_ https://example.com/target;\n\n');
      expect(result.ok && result.hasRedirects).toBe(false);
    });

    it('skips a URL whose path already equals the canonical path', () => {
      const result = generateRedirects({
        urls: ['https://example.com/target'],
        targetUrl,
        template: 'nginx',
        merge: true,
        grouped: false,
      });
      expect(result.ok && result.output).toBe('set $target_url_ https://example.com/target;\n\n');
    });

    it('skips a URL whose path equals the canonical path only up to a trailing slash', () => {
      const result = generateRedirects({
        urls: ['https://example.com/target/'],
        targetUrl,
        template: 'nginx',
        merge: true,
        grouped: false,
      });
      expect(result.ok && result.output).toBe('set $target_url_ https://example.com/target;\n\n');
    });

    it('escapes regex special characters in the path, including [ ] (bug fix)', () => {
      const result = generateRedirects({
        urls: ['https://example.com/a.b[c]d'],
        targetUrl,
        template: 'nginx',
        merge: true,
        grouped: false,
      });
      expect(result.ok && result.output).toContain('^/a\\.b\\[c\\]d/?$');
    });

    it('replaces spaces in the path with \\s', () => {
      const result = generateRedirects({
        urls: ['https://example.com/old%20page'],
        targetUrl,
        template: 'nginx',
        merge: true,
        grouped: false,
      });
      expect(result.ok && result.output).toContain('^/old\\spage/?$');
    });

    it('does not throw on a path with a percent-sequence that is not valid UTF-8 (bug fix: decodeURIComponent falls back to the raw path)', () => {
      const result = generateRedirects({
        urls: ['https://example.com/%ff%fe'],
        targetUrl,
        template: 'nginx',
        merge: true,
        grouped: false,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.output).toContain('^/%ff%fe/?$');
    });

    it('skips blank lines in the input', () => {
      const result = generateRedirects({
        urls: ['https://example.com/a', '', '   ', 'https://example.com/b'],
        targetUrl,
        template: 'nginx',
        merge: true,
        grouped: false,
      });
      expect(result.ok).toBe(true);
      expect(result.ok && result.unparseableUrls).toEqual([]);
    });
  });

  describe('trailing slash normalization', () => {
    it('treats /page and /page/ as the same path, deduplicating into a single rule', () => {
      const result = generateRedirects({
        urls: ['https://example.com/a', 'https://example.com/a/'],
        targetUrl,
        template: 'nginx',
        merge: true,
        grouped: false,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const ruleCount = result.output.match(/location/g)?.length ?? 0;
      expect(ruleCount).toBe(1);
      expect(result.output).toContain('location ~* ^/a/?$ {\n  return 301 $target_url_;\n}');
    });
  });

  describe('grouping', () => {
    it('collapses duplicate paths into a single rule', () => {
      const result = generateRedirects({
        urls: ['https://example.com/a/b', 'https://example.com/a/b'],
        targetUrl,
        template: 'nginx',
        merge: true,
        grouped: false,
      });
      const ruleCount = (result.ok ? result.output.match(/location/g) : [])?.length ?? 0;
      expect(ruleCount).toBe(1);
    });

    it('merges multiple distinct paths into one location block via alternation', () => {
      const result = generateRedirects({
        urls: ['https://example.com/a', 'https://example.com/b', 'https://example.com/c'],
        targetUrl,
        template: 'nginx',
        merge: true,
        grouped: false,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.output).toContain(
        'location ~* ^(/a/?|/b/?|/c/?)$ {\n  return 301 $target_url_;\n}',
      );
    });

    it('groups by the first path segment specifically, not deeper ones (bug fix: keeps the leading "/")', () => {
      const result = generateRedirects({
        urls: ['https://example.com/a/b/c', 'https://example.com/a/b/d', 'https://example.com/a/x'],
        targetUrl,
        template: 'nginx',
        merge: true,
        grouped: true,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const ruleCount = result.output.match(/location/g)?.length ?? 0;
      expect(ruleCount).toBe(1);
      expect(result.output).toContain('location ~* ^/a/(.*)$ {\n  return 301 $target_url_;\n}');
    });
  });

  describe('merge toggle', () => {
    it('generates a separate nginx location block per path when merge is disabled', () => {
      const result = generateRedirects({
        urls: ['https://example.com/a', 'https://example.com/b'],
        targetUrl,
        template: 'nginx',
        merge: false,
        grouped: false,
      });
      expect(result.ok && result.output).toBe(
        'set $target_url_ https://example.com/target;\n\n' +
          'location ~* ^/a/?$ {\n  return 301 $target_url_;\n}\n' +
          'location ~* ^/b/?$ {\n  return 301 $target_url_;\n}',
      );
    });

    it('generates a separate apache RedirectMatch per path when merge is disabled (target without its own query)', () => {
      const result = generateRedirects({
        urls: ['https://example.com/a', 'https://example.com/b'],
        targetUrl,
        template: 'apache',
        merge: false,
        grouped: false,
      });
      expect(result.ok && result.output).toBe(
        'RedirectMatch 301 "(?i)^/a/?$" "https://example.com/target"\n' +
          'RedirectMatch 301 "(?i)^/b/?$" "https://example.com/target"',
      );
    });

    it('does not change the apache RewriteCond-chain branch when the target has its own query (merge is not applicable there)', () => {
      const targetWithQuery = 'https://example.com/target?utm=1';
      const withMerge = generateRedirects({
        urls: ['https://example.com/a', 'https://example.com/b'],
        targetUrl: targetWithQuery,
        template: 'apache',
        merge: true,
        grouped: false,
      });
      const withoutMerge = generateRedirects({
        urls: ['https://example.com/a', 'https://example.com/b'],
        targetUrl: targetWithQuery,
        template: 'apache',
        merge: false,
        grouped: false,
      });
      expect(withMerge.ok && withMerge.output).toBe(withoutMerge.ok && withoutMerge.output);
      expect(withMerge.ok && withMerge.output).toContain(
        'RewriteCond %{REQUEST_URI} ^/a/?$ [NC,OR]',
      );
    });
  });

  describe('subdomain detection', () => {
    it('flags a different host as a subdomain', () => {
      const result = generateRedirects({
        urls: ['https://other.com/page'],
        targetUrl,
        template: 'nginx',
        merge: true,
        grouped: false,
      });
      expect(result.ok && result.subdomains).toEqual(['other.com']);
    });

    it('does not flag the www. variant of the canonical host', () => {
      const result = generateRedirects({
        urls: ['https://www.example.com/page'],
        targetUrl,
        template: 'nginx',
        merge: true,
        grouped: false,
      });
      expect(result.ok && result.subdomains).toEqual([]);
    });

    it('does not flag the naked domain when the canonical host itself has www. (bug fix: symmetric www check)', () => {
      const result = generateRedirects({
        urls: ['https://example.com/page'],
        targetUrl: 'https://www.example.com/target',
        template: 'nginx',
        merge: true,
        grouped: false,
      });
      expect(result.ok && result.subdomains).toEqual([]);
    });

    it('ignores port differences when comparing hosts (bug fix: hostname, not host)', () => {
      const result = generateRedirects({
        urls: ['https://example.com:8443/page'],
        targetUrl,
        template: 'nginx',
        merge: true,
        grouped: false,
      });
      expect(result.ok && result.subdomains).toEqual([]);
    });
  });

  describe('unparseable URLs', () => {
    it('collects an invalid URL without blocking the rest of the batch', () => {
      const result = generateRedirects({
        urls: ['not a url', 'https://example.com/valid'],
        targetUrl,
        template: 'nginx',
        merge: true,
        grouped: false,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.unparseableUrls).toEqual(['not a url']);
      expect(result.output).toContain('/valid');
    });
  });

  describe('config injection safety', () => {
    it('rejects a target URL containing a literal semicolon (nginx statement terminator)', () => {
      const result = generateRedirects({
        urls: ['https://example.com/a'],
        targetUrl: 'https://example.com/target;return 301 https://evil.com;',
        template: 'nginx',
        merge: true,
        grouped: false,
      });
      expect(result).toEqual({ ok: false, error: 'invalid-target-url' });
    });

    it('rejects a target URL containing a literal double quote (Apache quote breakout)', () => {
      const result = generateRedirects({
        urls: ['https://example.com/a'],
        targetUrl: 'https://example.com/target" Require all granted #',
        template: 'apache',
        merge: true,
        grouped: false,
      });
      expect(result).toEqual({ ok: false, error: 'invalid-target-url' });
    });

    it('excludes a path containing a literal semicolon instead of embedding it unescaped', () => {
      const result = generateRedirects({
        urls: ['https://example.com/old;return 301 https://evil.com'],
        targetUrl,
        template: 'nginx',
        merge: true,
        grouped: false,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.unparseableUrls).toEqual([
        'https://example.com/old;return 301 https://evil.com',
      ]);
      expect(result.output).not.toContain('evil.com');
    });

    it('excludes a path whose percent-encoded semicolon decodes into a raw one (bug: naive pre-decode check would miss this)', () => {
      const result = generateRedirects({
        urls: ['https://example.com/old%3Breturn%20301%20https://evil.com'],
        targetUrl,
        template: 'nginx',
        merge: true,
        grouped: false,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.unparseableUrls).toHaveLength(1);
      expect(result.output).not.toContain('evil.com');
    });

    it('excludes a path containing a literal double quote after decoding', () => {
      const result = generateRedirects({
        urls: ['https://example.com/old%22page'],
        targetUrl,
        template: 'apache',
        merge: true,
        grouped: false,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.unparseableUrls).toHaveLength(1);
      expect(result.output).toBe('');
    });

    it('excludes a whole URL when a query key decodes into something containing a semicolon, rather than embedding it in the quoted nginx condition', () => {
      const result = generateRedirects({
        urls: ['https://example.com/page?utm%3Breturn=1'],
        targetUrl,
        template: 'nginx',
        merge: true,
        grouped: false,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.unparseableUrls).toEqual(['https://example.com/page?utm%3Breturn=1']);
      expect(result.output).not.toContain(';return');
    });

    it('excludes a whole URL when a query value decodes into something containing a double quote', () => {
      const result = generateRedirects({
        urls: ['https://example.com/page?utm=a%22b'],
        targetUrl,
        template: 'nginx',
        merge: true,
        grouped: false,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.unparseableUrls).toEqual(['https://example.com/page?utm=a%22b']);
      expect(result.output).not.toContain('a"b');
    });
  });

  describe('query-based redirects', () => {
    it('generates a condition per distinct query param, not just the first (bug fix)', () => {
      const result = generateRedirects({
        urls: ['https://example.com/page?utm_source=a&utm_medium=b'],
        targetUrl,
        template: 'nginx',
        merge: true,
        grouped: false,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.output).toContain('utm_source');
      expect(result.output).toContain('utm_medium');
    });

    it('deduplicates identical conditions across different URLs', () => {
      const result = generateRedirects({
        urls: ['https://example.com/a?utm_source=x', 'https://example.com/b?utm_source=x'],
        targetUrl,
        template: 'nginx',
        merge: true,
        grouped: false,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const occurrences = result.output.match(/utm_source/g)?.length ?? 0;
      expect(occurrences).toBe(1);
    });

    it('matches by key only when the raw value differs from its decoded form (bug fix)', () => {
      const result = generateRedirects({
        urls: ['https://example.com/page?q=a%2Fb'],
        targetUrl,
        template: 'nginx',
        merge: true,
        grouped: false,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.output).toContain('if ($args ~* "(^|&)q=([^&]*)(&|$)")');
    });

    it('matches by exact value when the raw value is not encoded', () => {
      const result = generateRedirects({
        urls: ['https://example.com/page?q=plain'],
        targetUrl,
        template: 'nginx',
        merge: true,
        grouped: false,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.output).toContain('if ($args ~* "(^|&)q=plain([^&]*)(&|$)")');
    });

    it('matches the key regardless of its position in the query string (bug fix: was anchored to the very start of $args)', () => {
      const result = generateRedirects({
        urls: ['https://example.com/page?q=plain'],
        targetUrl,
        template: 'nginx',
        merge: true,
        grouped: false,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.output).not.toContain('"^q=');
    });

    it('does not truncate a query value at "/" or whitespace (bug fix: was silently over-matching)', () => {
      const result = generateRedirects({
        urls: ['https://example.com/page?q=foo/bar'],
        targetUrl,
        template: 'nginx',
        merge: true,
        grouped: false,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.output).toContain('if ($args ~* "(^|&)q=foo/bar([^&]*)(&|$)")');
    });

    it('a URL with query params never also produces a path-based rule (documented behavior)', () => {
      const result = generateRedirects({
        urls: ['https://example.com/some-page?utm_source=a'],
        targetUrl,
        template: 'nginx',
        merge: true,
        grouped: false,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.output).not.toContain('/some-page$');
      expect(result.hasRedirects).toBe(true);
    });
  });

  describe('apache', () => {
    describe('target without its own query string — uses RedirectMatch (mod_alias)', () => {
      it('generates a single RedirectMatch rule covering every path, case-insensitive', () => {
        const result = generateRedirects({
          urls: ['https://example.com/a', 'https://example.com/b'],
          targetUrl,
          template: 'apache',
          merge: true,
          grouped: false,
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.output).toBe(`RedirectMatch 301 "(?i)^(/a/?|/b/?)$" "${targetUrl}"`);
      });

      it('anchors grouped rules with the leading "/" too (bug fix carried over from RewriteCond-based grouping)', () => {
        const result = generateRedirects({
          urls: ['https://example.com/a/b', 'https://example.com/a/c'],
          targetUrl,
          template: 'apache',
          merge: true,
          grouped: true,
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.output).toBe(`RedirectMatch 301 "(?i)^/a/(.*)$" "${targetUrl}"`);
      });

      it('produces no RedirectMatch at all when there is nothing to redirect (bug fix: was an unconditional site-wide redirect)', () => {
        const result = generateRedirects({
          urls: ['https://example.com/', 'https://example.com/robots.txt'],
          targetUrl,
          template: 'apache',
          merge: true,
          grouped: false,
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.output).toBe('');
        expect(result.hasRedirects).toBe(false);
      });
    });

    describe('target with its own query string — stays on RewriteRule + QSD (mod_alias cannot discard the source query)', () => {
      const targetWithQuery = 'https://example.com/target?utm=1';

      it('chains RewriteCond with [NC,OR] on every rule except the last', () => {
        const result = generateRedirects({
          urls: ['https://example.com/a', 'https://example.com/b'],
          targetUrl: targetWithQuery,
          template: 'apache',
          merge: true,
          grouped: false,
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        const lines = result.output
          .trim()
          .split('\n')
          .filter((line) => line.startsWith('RewriteCond %{REQUEST_URI}'));
        expect(lines[0]).toMatch(/\[NC,OR\]$/);
        expect(lines[lines.length - 1]).toMatch(/\[NC\]$/);
      });

      it('puts the RewriteRule to the target last, after the conditions, discarding the original query string via QSD', () => {
        const result = generateRedirects({
          urls: ['https://example.com/a'],
          targetUrl: targetWithQuery,
          template: 'apache',
          merge: true,
          grouped: false,
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(
          result.output.trim().endsWith(`RewriteRule ^(.*)$ ${targetWithQuery} [R=301,L,QSD]`),
        ).toBe(true);
      });

      it('keeps the target URL untouched (no ambiguous extra "?") when it already has its own query string', () => {
        const result = generateRedirects({
          urls: ['https://example.com/a'],
          targetUrl: targetWithQuery,
          template: 'apache',
          merge: true,
          grouped: false,
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(
          result.output.trim().endsWith(`RewriteRule ^(.*)$ ${targetWithQuery} [R=301,L,QSD]`),
        ).toBe(true);
      });

      it('anchors grouped rules with the leading "/" too (bug fix)', () => {
        const result = generateRedirects({
          urls: ['https://example.com/a/b', 'https://example.com/a/c'],
          targetUrl: targetWithQuery,
          template: 'apache',
          merge: true,
          grouped: true,
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.output).toContain('RewriteCond %{REQUEST_URI} ^/a/(.*)$ [NC]');
      });

      it('produces no RewriteRule at all when there is nothing to redirect', () => {
        const result = generateRedirects({
          urls: ['https://example.com/', 'https://example.com/robots.txt'],
          targetUrl: targetWithQuery,
          template: 'apache',
          merge: true,
          grouped: false,
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.output).toBe('');
        expect(result.hasRedirects).toBe(false);
      });
    });

    describe('query-based redirects (always RewriteCond/RewriteRule, regardless of the target)', () => {
      it('generates a query-string condition, not a path rule, for a URL with query params', () => {
        const result = generateRedirects({
          urls: ['https://example.com/page?utm_source=a'],
          targetUrl,
          template: 'apache',
          merge: true,
          grouped: false,
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.output).toContain(
          'RewriteCond %{QUERY_STRING} (^|&)utm_source=a([^&]*)(&|$) [NC,OR]',
        );
      });

      it('falls back to a key-only match when the raw query value is unreliably encoded (bug fix: apache ignored this entirely)', () => {
        const result = generateRedirects({
          urls: ['https://example.com/page?q=a%2Fb'],
          targetUrl,
          template: 'apache',
          merge: true,
          grouped: false,
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.output).toContain('RewriteCond %{QUERY_STRING} (^|&)q=([^&]*)(&|$) [NC,OR]');
      });

      it('coexists independently with a path-based RedirectMatch when the target has no query of its own', () => {
        const result = generateRedirects({
          urls: ['https://example.com/a', 'https://example.com/page?utm_source=x'],
          targetUrl,
          template: 'apache',
          merge: true,
          grouped: false,
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.output).toContain('RewriteCond %{QUERY_STRING}');
        expect(result.output).toContain(`RewriteRule ^(.*)$ ${targetUrl} [R=301,L,QSD]`);
        expect(result.output).toContain(`RedirectMatch 301 "(?i)^/a/?$" "${targetUrl}"`);
      });
    });
  });
});
