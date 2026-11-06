import { afterEach, describe, expect, it } from 'vitest';
import { detectLanguage } from './detect-language';

function stubNavigatorLanguage(value: string) {
  Object.defineProperty(navigator, 'language', { value, configurable: true });
}

afterEach(() => {
  localStorage.clear();
  Reflect.deleteProperty(navigator, 'language');
});

describe('detectLanguage', () => {
  it('returns the stored language when it is valid', () => {
    stubNavigatorLanguage('en-US');
    localStorage.setItem('language', 'ru');

    expect(detectLanguage()).toBe('ru');
  });

  it('falls back to the browser language when the stored value is invalid', () => {
    localStorage.setItem('language', 'fr');
    stubNavigatorLanguage('ru-RU');

    expect(detectLanguage()).toBe('ru');
  });

  it('uses the browser language when nothing is stored', () => {
    stubNavigatorLanguage('ru-RU');
    expect(detectLanguage()).toBe('ru');

    stubNavigatorLanguage('en-US');
    expect(detectLanguage()).toBe('en');
  });

  it('falls back to "en" for an unsupported browser language', () => {
    stubNavigatorLanguage('fr-FR');
    expect(detectLanguage()).toBe('en');
  });
});
