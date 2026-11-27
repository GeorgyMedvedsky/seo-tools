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

export function patternForPaths(fragments: string[]): string {
  return fragments.length === 1 ? fragments[0] : `(${fragments.join('|')})`;
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
