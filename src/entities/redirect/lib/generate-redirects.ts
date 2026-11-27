import { escapeRegExp } from 'shared/lib/utils';
import { EXCLUDED_PATHS } from '../config/excluded-paths';
import type { GenerateRedirectsParams, GenerateRedirectsResult } from '../model/types';
import {
  apacheRedirectMatch,
  formatPathForRegex,
  hasUnsafeConfigCharacters,
  patternForPaths,
  safeDecodeURIComponent,
  targetHasOwnQuery,
} from './path-format';

function pathFragment(rawPath: string, isGrouped: boolean): string {
  return `${formatPathForRegex(rawPath)}${isGrouped ? '/(.*)' : ''}`;
}

function nginxLocationBlock(pattern: string): string {
  return `location ~* ^${pattern}$ {\n  return 301 $target_url_;\n}`;
}

function apacheRewriteCond(rawPath: string, isLast: boolean, isGrouped: boolean): string {
  return `RewriteCond %{REQUEST_URI} ^${pathFragment(rawPath, isGrouped)}$ [NC${isLast ? '' : ',OR'}]`;
}

function queryNginxTemplate(key: string, value: string, valueIsUnreliable: boolean): string {
  const valuePart = valueIsUnreliable ? '' : escapeRegExp(value);
  return `if ($args ~* "(^|&)${escapeRegExp(key)}=${valuePart}([^&]*)(&|$)") {\n  return 301 $target_url_;\n}\n\n`;
}

function queryApacheTemplate(key: string, value: string, valueIsUnreliable: boolean): string {
  const valuePart = valueIsUnreliable ? '' : escapeRegExp(value);
  return `RewriteCond %{QUERY_STRING} (^|&)${escapeRegExp(key)}=${valuePart}([^&]*)(&|$) [NC,OR]\n`;
}

function getRawQueryValue(rawSearch: string, key: string): string | undefined {
  const pairs = rawSearch.replace(/^\?/, '').split('&');
  for (const pair of pairs) {
    const [rawKey, rawValue = ''] = pair.split('=');
    if (safeDecodeURIComponent(rawKey.replace(/\+/g, ' ')) === key) {
      return rawValue;
    }
  }
  return undefined;
}

function isValueUnreliablyEncoded(url: URL, key: string, decodedValue: string): boolean {
  const rawValue = getRawQueryValue(url.search, key);
  return rawValue !== undefined && rawValue !== decodedValue;
}

function normalizeHost(hostname: string): string {
  return hostname.startsWith('www.') ? hostname.slice(4) : hostname;
}

export function generateRedirects({
  urls,
  targetUrl,
  template,
  grouped,
}: GenerateRedirectsParams): GenerateRedirectsResult {
  const trimmedTargetUrl = targetUrl.trim();

  let canonical: URL;
  try {
    canonical = new URL(trimmedTargetUrl);
  } catch {
    return { ok: false, error: 'invalid-target-url' };
  }

  if (hasUnsafeConfigCharacters(trimmedTargetUrl)) {
    return { ok: false, error: 'invalid-target-url' };
  }

  const subdomains = new Set<string>();
  const unparseableUrls: string[] = [];
  const groupedRedirects = new Set<string>();
  const existingQueryConditions = new Set<string>();
  let queryRedirects = '';

  const canonicalPath = safeDecodeURIComponent(canonical.pathname);

  for (const rawUrl of urls) {
    const url = rawUrl.trim();
    if (!url) continue;

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      unparseableUrls.push(url);
      continue;
    }

    if (normalizeHost(parsedUrl.hostname) !== normalizeHost(canonical.hostname)) {
      subdomains.add(parsedUrl.host);
    }

    const params = parsedUrl.searchParams;
    if ([...params.keys()].length > 0) {
      const paramEntries = [...params];
      const hasUnsafeParam = paramEntries.some(
        ([key, value]) => hasUnsafeConfigCharacters(key) || hasUnsafeConfigCharacters(value),
      );
      if (hasUnsafeParam) {
        unparseableUrls.push(url);
        continue;
      }

      for (const [key, value] of paramEntries) {
        const unreliable = isValueUnreliablyEncoded(parsedUrl, key, value);
        const condition =
          template === 'nginx'
            ? queryNginxTemplate(key, value, unreliable)
            : queryApacheTemplate(key, value, unreliable);

        if (!existingQueryConditions.has(condition)) {
          queryRedirects += condition;
          existingQueryConditions.add(condition);
        }
      }
      continue;
    }

    const rawPath = safeDecodeURIComponent(parsedUrl.pathname);
    if (hasUnsafeConfigCharacters(rawPath)) {
      unparseableUrls.push(url);
      continue;
    }
    if (EXCLUDED_PATHS.includes(rawPath)) continue;
    if (rawPath === canonicalPath) continue;

    const key = grouped ? `/${rawPath.split('/')[1]}` : rawPath;
    groupedRedirects.add(key);
  }

  const paths = [...groupedRedirects];
  const pattern = () => patternForPaths(paths.map((path) => pathFragment(path, grouped)));

  let output: string;
  let hasConditions: boolean;

  if (template === 'nginx') {
    const pathBlock = paths.length > 0 ? nginxLocationBlock(pattern()) : '';
    hasConditions = queryRedirects !== '' || pathBlock !== '';
    output = `set $target_url_ ${trimmedTargetUrl};\n\n${queryRedirects}${pathBlock}`;
  } else if (targetHasOwnQuery(trimmedTargetUrl)) {
    const pathConditions = paths.map((path, index) =>
      apacheRewriteCond(path, index === paths.length - 1, grouped),
    );
    hasConditions = queryRedirects !== '' || pathConditions.length > 0;
    output = hasConditions
      ? `${queryRedirects}${pathConditions.join('\n')}\nRewriteRule ^(.*)$ ${trimmedTargetUrl} [R=301,L,QSD]\n\n`
      : '';
  } else {
    const queryBlock = queryRedirects
      ? `${queryRedirects}RewriteRule ^(.*)$ ${trimmedTargetUrl} [R=301,L,QSD]\n\n`
      : '';
    const pathBlock = paths.length > 0 ? apacheRedirectMatch(pattern(), trimmedTargetUrl) : '';
    hasConditions = queryBlock !== '' || pathBlock !== '';
    output = `${queryBlock}${pathBlock}`;
  }

  return {
    ok: true,
    output,
    subdomains: [...subdomains],
    unparseableUrls,
    hasRedirects: hasConditions,
  };
}
