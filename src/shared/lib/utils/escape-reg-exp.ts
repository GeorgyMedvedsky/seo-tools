const SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;

export function escapeRegExp(value: string): string {
  return value.replace(SPECIAL_CHARS, '\\$&');
}
