import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ru from './locales/ru.json';
import { detectLanguage, LANGUAGE_STORAGE_KEY } from './detect-language';

void i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ru: { translation: ru },
  },
  lng: detectLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

document.documentElement.setAttribute('lang', i18next.language);

i18next.on('languageChanged', (language) => {
  document.documentElement.setAttribute('lang', language);
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
});

export { i18next };
