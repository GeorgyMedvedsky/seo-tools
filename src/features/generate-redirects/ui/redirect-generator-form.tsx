import { Copy, Download, RotateCcw, Wand2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from 'shared/ui/button';
import { TextArea } from 'shared/ui/text-area';
import { TextField } from 'shared/ui/text-field';
import { OutputField } from 'shared/ui/output-field';
import { NoticePanel } from 'shared/ui/notice-panel';
import type { GenerateRedirectsController } from '../model/use-generate-redirects';
import styles from './redirect-generator-form.module.scss';

type RedirectGeneratorFormTitleProps = {
  title: string;
};

export function RedirectGeneratorFormTitle({ title }: RedirectGeneratorFormTitleProps) {
  const words = title.split(' ');

  return (
    <h1 className={styles.title}>
      {words.map((word, index) => (
        <span key={`${word}-${index}`}>
          <span className={styles.titleAccent}>{word.charAt(0)}</span>
          {word.slice(1)}
          {index < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </h1>
  );
}

type RedirectGeneratorFormProps = {
  generator: GenerateRedirectsController;
};

export function RedirectGeneratorForm({ generator }: RedirectGeneratorFormProps) {
  const { state, notification, actions } = generator;
  const { t } = useTranslation();
  const hasOutput = state.output.length > 0 && !state.nothingToRedirect;

  return (
    <section className={styles.root}>
      <RedirectGeneratorFormTitle title={t('redirectGeneratorForm.title')} />

      <TextArea
        id="inputUrls"
        label={t('redirectGeneratorForm.inputUrlsLabel')}
        rows={10}
        placeholder={t('redirectGeneratorForm.inputUrlsPlaceholder')}
        value={state.urlsInput}
        onChange={(event) => actions.setUrlsInput(event.target.value)}
      />

      <TextField
        id="targetUrl"
        label={t('redirectGeneratorForm.targetUrlLabel')}
        placeholder="https://example.com/target"
        value={state.targetUrl}
        onChange={(event) => actions.setTargetUrl(event.target.value)}
      />

      <div className={styles.buttons}>
        <Button onClick={actions.generate}>
          <Wand2 size={16} aria-hidden="true" />
          {t('redirectGeneratorForm.generate')}
        </Button>
        <Button variant="secondary" onClick={() => void actions.copyOutput()} disabled={!hasOutput}>
          <Copy size={16} aria-hidden="true" />
          {t('redirectGeneratorForm.copy')}
        </Button>
        <Button variant="secondary" onClick={actions.downloadOutput} disabled={!hasOutput}>
          <Download size={16} aria-hidden="true" />
          {t('redirectGeneratorForm.download')}
        </Button>
        <Button variant="ghost" onClick={actions.reset}>
          <RotateCcw size={16} aria-hidden="true" />
          {t('redirectGeneratorForm.reset')}
        </Button>
      </div>

      <div className={styles.notification} role="status">
        {notification}
      </div>
      {state.targetUrlError && (
        <p className={styles.error}>
          {t(`redirectGeneratorForm.targetUrlErrors.${state.targetUrlError}`)}
        </p>
      )}
      {state.nothingToRedirect && (
        <p className={styles.error}>{t('redirectGeneratorForm.nothingToRedirect')}</p>
      )}

      <OutputField
        id="output"
        label={t('redirectGeneratorForm.resultLabel')}
        value={state.output}
      />

      <div className={styles.notices}>
        <NoticePanel
          open={state.warningPanelOpen}
          variant="warning"
          title={t('redirectGeneratorForm.subdomainsNoticeTitle')}
          items={state.subdomains}
          closeLabel={t('redirectGeneratorForm.closeWarning')}
          onClose={actions.closeWarningPanel}
        />
        <NoticePanel
          open={state.errorPanelOpen}
          variant="error"
          title={t('redirectGeneratorForm.unparseableNoticeTitle')}
          items={state.unparseableUrls}
          closeLabel={t('redirectGeneratorForm.closeError')}
          onClose={actions.closeErrorPanel}
        />
      </div>
    </section>
  );
}
