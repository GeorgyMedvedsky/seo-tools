import type { RedirectTemplate } from '../model/types';
import {
  apacheRedirectMatch,
  exactPathPattern,
  hasUnsafeConfigCharacters,
  normalizeHost,
  normalizePath,
  patternsForMerge,
  safeDecodeURIComponent,
  targetHasOwnQuery,
} from './path-format';

export type RedirectPair = { source: string; target: string };

export type GenerateRedirectPairsParams = {
  lines: string[];
  template: RedirectTemplate;
  merge: boolean;
};

export type GenerateRedirectPairsResult = {
  ok: true;
  output: string;
  unparseableLines: string[];
  conflictingSources: string[];
  redirectCycles: string[];
  collapsedChains: string[];
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

type ChainResolution = { target: string; collapsed: boolean } | { cycle: true };

function resolveChainTarget(
  startPath: string,
  targetByPath: Map<string, string>,
  sourceHosts: Set<string>,
): ChainResolution {
  const visited = new Set<string>([startPath]);
  let target = targetByPath.get(startPath) as string;
  let collapsed = false;

  while (true) {
    let targetUrl: URL;
    try {
      targetUrl = new URL(target);
    } catch {
      return { target, collapsed };
    }

    if (!sourceHosts.has(normalizeHost(targetUrl.hostname))) return { target, collapsed };

    const nextPath = normalizePath(safeDecodeURIComponent(targetUrl.pathname));
    if (!targetByPath.has(nextPath)) return { target, collapsed };
    if (visited.has(nextPath)) return { cycle: true };

    visited.add(nextPath);
    target = targetByPath.get(nextPath) as string;
    collapsed = true;
  }
}

export function generateRedirectPairs({
  lines,
  template,
  merge,
}: GenerateRedirectPairsParams): GenerateRedirectPairsResult {
  const unparseableLines: string[] = [];
  const conflictingSources = new Set<string>();
  const targetByPath = new Map<string, string>();
  const sourceHosts = new Set<string>();

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

    const sourceUrl = new URL(source);
    const path = normalizePath(safeDecodeURIComponent(sourceUrl.pathname));
    if (hasUnsafeConfigCharacters(path)) {
      unparseableLines.push(line);
      continue;
    }

    sourceHosts.add(normalizeHost(sourceUrl.hostname));

    const existingTarget = targetByPath.get(path);

    if (existingTarget === undefined) {
      targetByPath.set(path, target);
    } else if (existingTarget !== target) {
      conflictingSources.add(path);
    }
  }

  const cleanTargetByPath = new Map(
    [...targetByPath].filter(([path]) => !conflictingSources.has(path)),
  );

  const redirectCycles = new Set<string>();
  const collapsedChains: string[] = [];
  const resolvedTargetByPath = new Map<string, string>();

  for (const path of cleanTargetByPath.keys()) {
    const resolution = resolveChainTarget(path, cleanTargetByPath, sourceHosts);
    if ('cycle' in resolution) {
      redirectCycles.add(path);
      continue;
    }

    resolvedTargetByPath.set(path, resolution.target);
    if (resolution.collapsed) {
      collapsedChains.push(path);
    }
  }

  const pathsByTarget = new Map<string, string[]>();
  for (const [path, target] of resolvedTargetByPath) {
    const existing = pathsByTarget.get(target);
    if (existing) {
      existing.push(path);
    } else {
      pathsByTarget.set(target, [path]);
    }
  }

  const rules = [...pathsByTarget.entries()].flatMap(([target, groupedPaths]) => {
    const patterns = patternsForMerge(
      groupedPaths.map((path) => exactPathPattern(path)),
      merge,
    );

    return patterns.map((pattern) => {
      if (template === 'nginx') {
        return nginxLocationBlock(pattern, target);
      }

      return targetHasOwnQuery(target)
        ? apacheRewriteRuleWithQuery(pattern, target)
        : apacheRedirectMatch(pattern, target);
    });
  });

  return {
    ok: true,
    output: rules.join('\n'),
    unparseableLines,
    conflictingSources: [...conflictingSources],
    redirectCycles: [...redirectCycles],
    collapsedChains,
    hasRedirects: rules.length > 0,
  };
}
