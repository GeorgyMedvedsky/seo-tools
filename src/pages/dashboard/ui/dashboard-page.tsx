import { useTranslation } from 'react-i18next';
import { AppHeader } from 'widgets/app-header';
import { Card } from 'shared/ui/card';
import { ROUTES } from 'shared/config';
import styles from './dashboard-page.module.scss';

export function DashboardPage() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <AppHeader />
      <main className={styles.main}>
        <h1 className={styles.title}>{t('dashboardPage.title')}</h1>
        <p className={styles.subtitle}>{t('dashboardPage.subtitle')}</p>
        <div className={styles.cards}>
          <Card
            to={ROUTES.redirectGenerator}
            title={t('dashboardPage.redirectGeneratorCard.title')}
            description={t('dashboardPage.redirectGeneratorCard.description')}
          />
        </div>
      </main>
    </div>
  );
}
