export type Language = 'en' | 'ru';

const STORAGE_KEY = 'language';
const SUPPORTED_LANGUAGES: Language[] = ['en', 'ru'];

function isSupportedLanguage(value: string | null): value is Language {
  return SUPPORTED_LANGUAGES.includes(value as Language);
}

function getStoredLanguage(): Language | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  return isSupportedLanguage(stored) ? stored : null;
}

function getBrowserLanguage(): Language {
  const code = navigator.language.slice(0, 2).toLowerCase();
  return isSupportedLanguage(code) ? code : 'en';
}

export function detectLanguage(): Language {
  return getStoredLanguage() ?? getBrowserLanguage();
}

export { STORAGE_KEY as LANGUAGE_STORAGE_KEY };
