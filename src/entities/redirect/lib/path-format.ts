import { escapeRegExp } from 'shared/lib/utils';

export function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function formatPathForRegex(rawPath: string): string {
  return escapeRegExp(rawPath).replaceAll(' ', '\\s');
}

export function exactPathPattern(rawPath: string): string {
  return `${formatPathForRegex(rawPath)}/?`;
}

export function normalizePath(path: string): string {
  return path !== '/' && path.endsWith('/') ? path.slice(0, -1) : path;
}

export function normalizeHost(hostname: string): string {
  return hostname.startsWith('www.') ? hostname.slice(4) : hostname;
}

export function patternForPaths(fragments: string[]): string {
  return fragments.length === 1 ? fragments[0] : `(${fragments.join('|')})`;
}

export function patternsForMerge(fragments: string[], merge: boolean): string[] {
  return merge ? [patternForPaths(fragments)] : fragments;
}

export function targetHasOwnQuery(targetUrl: string): boolean {
  return new URL(targetUrl).search !== '';
}

const UNSAFE_CONFIG_CHARACTERS = /["\n\r;]/;

export function hasUnsafeConfigCharacters(value: string): boolean {
  return UNSAFE_CONFIG_CHARACTERS.test(value);
}

export function apacheRedirectMatch(pattern: string, target: string): string {
  return `RedirectMatch 301 "(?i)^${pattern}$" "${target}"`;
}
