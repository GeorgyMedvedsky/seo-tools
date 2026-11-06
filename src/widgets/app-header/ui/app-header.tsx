import { Link } from 'react-router';
import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from 'shared/config';
import type { Language } from 'shared/config';
import { useTheme } from 'shared/lib/hooks';
import styles from './app-header.module.scss';

const NEXT_LANGUAGE: Record<Language, Language> = { en: 'ru', ru: 'en' };
const LANGUAGE_CODE_LABEL: Record<Language, string> = { en: 'EN', ru: 'RU' };
const SWITCH_LANGUAGE_KEY: Record<Language, string> = {
  en: 'appHeader.switchToRussian',
  ru: 'appHeader.switchToEnglish',
};

export function AppHeader() {
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const language = i18n.language as Language;
  const nextLanguage = NEXT_LANGUAGE[language];

  return (
    <header className={styles.header}>
      <Link to={ROUTES.dashboard} className={styles.logo}>
        {t('appHeader.logo')}
      </Link>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.languageToggle}
          onClick={() => void i18n.changeLanguage(nextLanguage)}
          aria-label={t(SWITCH_LANGUAGE_KEY[language])}
        >
          {LANGUAGE_CODE_LABEL[nextLanguage]}
        </button>
        <button
          type="button"
          className={styles.themeToggle}
          onClick={toggleTheme}
          aria-label={
            theme === 'dark' ? t('appHeader.switchToLightTheme') : t('appHeader.switchToDarkTheme')
          }
        >
          {theme === 'dark' ? (
            <Sun size={18} aria-hidden="true" />
          ) : (
            <Moon size={18} aria-hidden="true" />
          )}
        </button>
      </div>
    </header>
  );
}
