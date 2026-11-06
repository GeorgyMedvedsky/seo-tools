import { describe, expect, it } from 'vitest';
import { generateRedirects } from './generate-redirects';

const targetUrl = 'https://example.com/target';

describe('generateRedirects', () => {
  it('fails upfront with a distinct error for an invalid target URL, without touching the input list', () => {
    const result = generateRedirects({
      urls: ['not a url', 'https://example.com/foo'],
      targetUrl: 'not-a-valid-url',
      template: 'nginx',
      grouped: false,
    });
    expect(result).toEqual({ ok: false, error: 'invalid-target-url' });
  });

  describe('nginx — path redirects', () => {
    it('generates a single rewrite rule for one URL', () => {
      const result = generateRedirects({
        urls: ['https://example.com/old-page'],
        targetUrl,
        template: 'nginx',
        grouped: false,
      });
      expect(result).toEqual({
        ok: true,
        output:
          'set $target_url_ https://example.com/target;\n\nrewrite (?i)^/old-page$ $target_url_? permanent;',
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
          grouped: false,
        });
        expect(result.ok && result.output).toBe('set $target_url_ https://example.com/target;\n\n');
        expect(result.ok && result.hasRedirects).toBe(false);
      },
    );

    it('skips a URL whose path already equals the canonical path', () => {
      const result = generateRedirects({
        urls: ['https://example.com/target'],
        targetUrl,
        template: 'nginx',
        grouped: false,
      });
      expect(result.ok && result.output).toBe('set $target_url_ https://example.com/target;\n\n');
    });

    it('escapes regex special characters in the path, including [ ] (bug fix)', () => {
      const result = generateRedirects({
        urls: ['https://example.com/a.b[c]d'],
        targetUrl,
        template: 'nginx',
        grouped: false,
      });
      expect(result.ok && result.output).toContain('^/a\\.b\\[c\\]d$');
    });

    it('replaces spaces in the path with \\s', () => {
      const result = generateRedirects({
        urls: ['https://example.com/old%20page'],
        targetUrl,
        template: 'nginx',
        grouped: false,
      });
      expect(result.ok && result.output).toContain('^/old\\spage$');
    });

    it('does not throw on a path with a percent-sequence that is not valid UTF-8 (bug fix: decodeURIComponent falls back to the raw path)', () => {
      const result = generateRedirects({
        urls: ['https://example.com/%ff%fe'],
        targetUrl,
        template: 'nginx',
        grouped: false,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.output).toContain('^/%ff%fe$');
    });

    it('skips blank lines in the input', () => {
      const result = generateRedirects({
        urls: ['https://example.com/a', '', '   ', 'https://example.com/b'],
        targetUrl,
        template: 'nginx',
        grouped: false,
      });
      expect(result.ok).toBe(true);
      expect(result.ok && result.unparseableUrls).toEqual([]);
    });
  });

  describe('grouping', () => {
    it('collapses duplicate paths into a single rule', () => {
      const result = generateRedirects({
        urls: ['https://example.com/a/b', 'https://example.com/a/b'],
        targetUrl,
        template: 'nginx',
        grouped: false,
      });
      const ruleCount = (result.ok ? result.output.match(/rewrite/g) : [])?.length ?? 0;
      expect(ruleCount).toBe(1);
    });

    it('groups by the first path segment specifically, not deeper ones (bug fix: keeps the leading "/")', () => {
      const result = generateRedirects({
        urls: ['https://example.com/a/b/c', 'https://example.com/a/b/d', 'https://example.com/a/x'],
        targetUrl,
        template: 'nginx',
        grouped: true,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const ruleCount = result.output.match(/rewrite/g)?.length ?? 0;
      expect(ruleCount).toBe(1);
      expect(result.output).toContain('rewrite (?i)^/a/(.*)$ $target_url_? permanent;');
    });
  });

  describe('subdomain detection', () => {
    it('flags a different host as a subdomain', () => {
      const result = generateRedirects({
        urls: ['https://other.com/page'],
        targetUrl,
        template: 'nginx',
        grouped: false,
      });
      expect(result.ok && result.subdomains).toEqual(['other.com']);
    });

    it('does not flag the www. variant of the canonical host', () => {
      const result = generateRedirects({
        urls: ['https://www.example.com/page'],
        targetUrl,
        template: 'nginx',
        grouped: false,
      });
      expect(result.ok && result.subdomains).toEqual([]);
    });

    it('does not flag the naked domain when the canonical host itself has www. (bug fix: symmetric www check)', () => {
      const result = generateRedirects({
        urls: ['https://example.com/page'],
        targetUrl: 'https://www.example.com/target',
        template: 'nginx',
        grouped: false,
      });
      expect(result.ok && result.subdomains).toEqual([]);
    });

    it('ignores port differences when comparing hosts (bug fix: hostname, not host)', () => {
      const result = generateRedirects({
        urls: ['https://example.com:8443/page'],
        targetUrl,
        template: 'nginx',
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
        grouped: false,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.unparseableUrls).toEqual(['not a url']);
      expect(result.output).toContain('/valid');
    });
  });

  describe('query-based redirects', () => {
    it('generates a condition per distinct query param, not just the first (bug fix)', () => {
      const result = generateRedirects({
        urls: ['https://example.com/page?utm_source=a&utm_medium=b'],
        targetUrl,
        template: 'nginx',
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
        grouped: false,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.output).not.toContain('/some-page$');
      expect(result.hasRedirects).toBe(true);
    });
  });

  describe('apache', () => {
    it('chains RewriteCond with [NC,OR] on every rule except the last', () => {
      const result = generateRedirects({
        urls: ['https://example.com/a', 'https://example.com/b'],
        targetUrl,
        template: 'apache',
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
        targetUrl,
        template: 'apache',
        grouped: false,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.output.trim().endsWith(`RewriteRule ^(.*)$ ${targetUrl} [R=301,L,QSD]`)).toBe(
        true,
      );
    });

    it('keeps the target URL untouched (no ambiguous extra "?") when it already has its own query string', () => {
      const result = generateRedirects({
        urls: ['https://example.com/a'],
        targetUrl: 'https://example.com/target?utm=1',
        template: 'apache',
        grouped: false,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(
        result.output
          .trim()
          .endsWith('RewriteRule ^(.*)$ https://example.com/target?utm=1 [R=301,L,QSD]'),
      ).toBe(true);
    });

    it('produces no RewriteRule at all when there is nothing to redirect (bug fix: was an unconditional site-wide redirect)', () => {
      const result = generateRedirects({
        urls: ['https://example.com/', 'https://example.com/robots.txt'],
        targetUrl,
        template: 'apache',
        grouped: false,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.output).toBe('');
      expect(result.hasRedirects).toBe(false);
    });

    it('anchors grouped rules with the leading "/" too (bug fix)', () => {
      const result = generateRedirects({
        urls: ['https://example.com/a/b', 'https://example.com/a/c'],
        targetUrl,
        template: 'apache',
        grouped: true,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.output).toContain('RewriteCond %{REQUEST_URI} ^/a/(.*)$ [NC]');
    });

    it('generates a query-string condition, not a path rule, for a URL with query params', () => {
      const result = generateRedirects({
        urls: ['https://example.com/page?utm_source=a'],
        targetUrl,
        template: 'apache',
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
        grouped: false,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.output).toContain('RewriteCond %{QUERY_STRING} (^|&)q=([^&]*)(&|$) [NC,OR]');
    });
  });
});
