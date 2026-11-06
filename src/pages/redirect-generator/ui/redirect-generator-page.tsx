import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppHeader } from 'widgets/app-header';
import {
  RedirectGeneratorForm,
  GeneratorSettings,
  useGenerateRedirects,
} from 'features/generate-redirects';
import { SidePanel } from 'shared/ui/side-panel';
import styles from './redirect-generator-page.module.scss';

export function RedirectGeneratorPage() {
  const generator = useGenerateRedirects();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <AppHeader />
      <div className={styles.container}>
        <RedirectGeneratorForm generator={generator} />
      </div>
      <SidePanel
        open={settingsOpen}
        onToggle={() => setSettingsOpen((open) => !open)}
        onClose={() => setSettingsOpen(false)}
        toggleLabel={t('redirectGeneratorPage.toggleSettingsPanel')}
      >
        <GeneratorSettings generator={generator} />
      </SidePanel>
    </div>
  );
}
