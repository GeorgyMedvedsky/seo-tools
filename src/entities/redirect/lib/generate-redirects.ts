import { escapeRegExp } from 'shared/lib/utils';
import { EXCLUDED_PATHS } from '../config/excluded-paths';
import type { GenerateRedirectsParams, GenerateRedirectsResult } from '../model/types';

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function formatPathForRegex(rawPath: string): string {
  return escapeRegExp(rawPath).replaceAll(' ', '\\s');
}

function nginxTemplate(rawPath: string, isGrouped: boolean): string {
  return `rewrite (?i)^${formatPathForRegex(rawPath)}${isGrouped ? '/(.*)' : ''}$ $target_url_? permanent;`;
}

function apacheTemplate(rawPath: string, isLast: boolean, isGrouped: boolean): string {
  return `RewriteCond %{REQUEST_URI} ^${formatPathForRegex(rawPath)}${isGrouped ? '/(.*)' : ''}$ [NC${isLast ? '' : ',OR'}]`;
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
  let canonical: URL;
  try {
    canonical = new URL(targetUrl.trim());
  } catch {
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
      for (const [key, value] of params) {
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
    if (EXCLUDED_PATHS.includes(rawPath)) continue;
    if (rawPath === canonicalPath) continue;

    const key = grouped ? `/${rawPath.split('/')[1]}` : rawPath;
    groupedRedirects.add(key);
  }

  const paths = [...groupedRedirects];
  const pathRedirects =
    template === 'nginx'
      ? paths.map((path) => nginxTemplate(path, grouped))
      : paths.map((path, index) => apacheTemplate(path, index === paths.length - 1, grouped));

  const trimmedTargetUrl = targetUrl.trim();
  const hasConditions = queryRedirects !== '' || pathRedirects.length > 0;
  const output =
    template === 'nginx'
      ? `set $target_url_ ${trimmedTargetUrl};\n\n${queryRedirects}${pathRedirects.join('\n')}`
      : hasConditions
        ? `${queryRedirects}${pathRedirects.join('\n')}\nRewriteRule ^(.*)$ ${trimmedTargetUrl} [R=301,L,QSD]\n\n`
        : '';

  return {
    ok: true,
    output,
    subdomains: [...subdomains],
    unparseableUrls,
    hasRedirects: hasConditions,
  };
}
