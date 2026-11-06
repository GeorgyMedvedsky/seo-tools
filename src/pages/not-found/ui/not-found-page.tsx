import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AppHeader } from 'widgets/app-header';
import { ROUTES } from 'shared/config';
import styles from './not-found-page.module.scss';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <AppHeader />
      <main className={styles.main}>
        <h1 className={styles.title}>{t('notFoundPage.title')}</h1>
        <p className={styles.subtitle}>{t('notFoundPage.subtitle')}</p>
        <Link to={ROUTES.dashboard} className={styles.link}>
          {t('notFoundPage.backToDashboard')}
        </Link>
      </main>
    </div>
  );
}
