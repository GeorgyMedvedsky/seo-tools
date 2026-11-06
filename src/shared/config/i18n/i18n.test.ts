import { afterEach, describe, expect, it } from 'vitest';
import { i18next } from './i18n';

afterEach(async () => {
  await i18next.changeLanguage('en');
  localStorage.clear();
});

describe('i18n', () => {
  it('syncs documentElement lang and persists the choice on language change', async () => {
    await i18next.changeLanguage('ru');

    expect(document.documentElement.getAttribute('lang')).toBe('ru');
    expect(localStorage.getItem('language')).toBe('ru');

    await i18next.changeLanguage('en');

    expect(document.documentElement.getAttribute('lang')).toBe('en');
    expect(localStorage.getItem('language')).toBe('en');
  });
});
