import { Link, useRouteError } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AppHeader } from 'widgets/app-header';
import { ROUTES } from 'shared/config';
import styles from './error-boundary-page.module.scss';

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function ErrorBoundaryPage() {
  const error = useRouteError();
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <AppHeader />
      <main className={styles.main}>
        <h1 className={styles.title}>{t('errorBoundaryPage.title')}</h1>
        <p className={styles.subtitle}>
          {getErrorMessage(error, t('errorBoundaryPage.defaultMessage'))}
        </p>
        <Link to={ROUTES.dashboard} className={styles.link}>
          {t('errorBoundaryPage.backToDashboard')}
        </Link>
      </main>
    </div>
  );
}
