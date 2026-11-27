import type { RedirectTemplate } from '../model/types';
import {
  apacheRedirectMatch,
  formatPathForRegex,
  hasUnsafeConfigCharacters,
  patternForPaths,
  safeDecodeURIComponent,
  targetHasOwnQuery,
} from './path-format';

export type RedirectPair = { source: string; target: string };

export type GenerateRedirectPairsParams = {
  lines: string[];
  template: RedirectTemplate;
};

export type GenerateRedirectPairsResult = {
  ok: true;
  output: string;
  unparseableLines: string[];
  conflictingSources: string[];
  hasRedirects: boolean;
};

const URL_PATTERN = /https?:\/\/\S+/g;

function extractPair(line: string): RedirectPair | null {
  const matches = line.match(URL_PATTERN);
  if (!matches || matches.length !== 2) return null;

  const [source, target] = matches;
  try {
    new URL(source);
    new URL(target);
  } catch {
    return null;
  }

  if (hasUnsafeConfigCharacters(source) || hasUnsafeConfigCharacters(target)) {
    return null;
  }

  return { source, target };
}

function nginxLocationBlock(pattern: string, target: string): string {
  return `location ~* ^${pattern}$ {\n  return 301 ${target};\n}`;
}

function apacheRewriteRuleWithQuery(pattern: string, target: string): string {
  return `RewriteRule "^${pattern}$" "${target}" [R=301,L,QSD,NC]`;
}

export function generateRedirectPairs({
  lines,
  template,
}: GenerateRedirectPairsParams): GenerateRedirectPairsResult {
  const unparseableLines: string[] = [];
  const conflictingSources = new Set<string>();
  const targetByPath = new Map<string, string>();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const pair = extractPair(line);
    if (!pair) {
      unparseableLines.push(line);
      continue;
    }

    const source = pair.source.trim();
    const target = pair.target.trim();
    if (source === target) continue;

    const path = safeDecodeURIComponent(new URL(source).pathname);
    if (hasUnsafeConfigCharacters(path)) {
      unparseableLines.push(line);
      continue;
    }

    const existingTarget = targetByPath.get(path);

    if (existingTarget === undefined) {
      targetByPath.set(path, target);
    } else if (existingTarget !== target) {
      conflictingSources.add(path);
    }
  }

  const paths = [...targetByPath.keys()].filter((path) => !conflictingSources.has(path));

  const pathsByTarget = new Map<string, string[]>();
  for (const path of paths) {
    const target = targetByPath.get(path) ?? '';
    const existing = pathsByTarget.get(target);
    if (existing) {
      existing.push(path);
    } else {
      pathsByTarget.set(target, [path]);
    }
  }

  const rules = [...pathsByTarget.entries()].map(([target, groupedPaths]) => {
    const pattern = patternForPaths(groupedPaths.map((path) => formatPathForRegex(path)));

    if (template === 'nginx') {
      return nginxLocationBlock(pattern, target);
    }

    return targetHasOwnQuery(target)
      ? apacheRewriteRuleWithQuery(pattern, target)
      : apacheRedirectMatch(pattern, target);
  });

  return {
    ok: true,
    output: rules.join('\n'),
    unparseableLines,
    conflictingSources: [...conflictingSources],
    hasRedirects: rules.length > 0,
  };
}
