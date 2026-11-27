import { Copy, Download, RotateCcw, Wand2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getDownloadFilename } from 'entities/redirect';
import { Button } from 'shared/ui/button';
import { TextArea } from 'shared/ui/text-area';
import { TextField } from 'shared/ui/text-field';
import { OutputField } from 'shared/ui/output-field';
import { NoticePanel } from 'shared/ui/notice-panel';
import { FileUploadButton } from 'shared/ui/file-upload-button';
import { InfoPopover } from 'shared/ui/info-popover';

const UPLOAD_ACCEPT = '.csv,.txt,text/csv,text/plain';
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

      {state.mode === 'single' ? (
        <>
          <TextArea
            id="inputUrls"
            label={t('redirectGeneratorForm.inputUrlsLabel')}
            rows={10}
            placeholder={t('redirectGeneratorForm.inputUrlsPlaceholder')}
            value={state.urlsInput}
            onChange={(event) => actions.setUrlsInput(event.target.value)}
          />

          <div className={styles.uploadRow}>
            <FileUploadButton
              label={t('redirectGeneratorForm.uploadFile')}
              accept={UPLOAD_ACCEPT}
              onFileText={actions.setUrlsInput}
              onError={actions.notifyUploadFailed}
            />
          </div>

          <TextField
            id="targetUrl"
            label={t('redirectGeneratorForm.targetUrlLabel')}
            placeholder="https://example.com/target"
            value={state.targetUrl}
            onChange={(event) => actions.setTargetUrl(event.target.value)}
          />
        </>
      ) : (
        <>
          <TextArea
            id="inputPairs"
            label={t('redirectGeneratorForm.inputPairsLabel')}
            rows={10}
            placeholder={t('redirectGeneratorForm.inputPairsPlaceholder')}
            value={state.pairsInput}
            onChange={(event) => actions.setPairsInput(event.target.value)}
          />

          <div className={styles.uploadRow}>
            <FileUploadButton
              label={t('redirectGeneratorForm.uploadFile')}
              accept={UPLOAD_ACCEPT}
              onFileText={actions.setPairsInput}
              onError={actions.notifyUploadFailed}
            />
          </div>
        </>
      )}

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
          {t('redirectGeneratorForm.download', { filename: getDownloadFilename(state.template) })}
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
        labelExtra={
          <InfoPopover label={t('redirectGeneratorForm.outputHelp.triggerLabel')}>
            {state.template === 'nginx' ? (
              <>
                <p>{t('redirectGeneratorForm.outputHelp.nginx.intro')}</p>
                <code className={styles.helpSnippet}>
                  {t('redirectGeneratorForm.outputHelp.nginx.snippet', {
                    filename: getDownloadFilename(state.template),
                  })}
                </code>
              </>
            ) : (
              <>
                <p>
                  {t('redirectGeneratorForm.outputHelp.apache.intro', {
                    filename: getDownloadFilename(state.template),
                  })}
                </p>
                <p>{t('redirectGeneratorForm.outputHelp.apache.note')}</p>
              </>
            )}
          </InfoPopover>
        }
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
        <NoticePanel
          open={state.conflictPanelOpen}
          variant="error"
          title={t('redirectGeneratorForm.conflictingSourcesNoticeTitle')}
          items={state.conflictingSources}
          closeLabel={t('redirectGeneratorForm.closeConflict')}
          onClose={actions.closeConflictPanel}
        />
        <NoticePanel
          open={state.cyclePanelOpen}
          variant="error"
          title={t('redirectGeneratorForm.redirectCyclesNoticeTitle')}
          items={state.redirectCycles}
          closeLabel={t('redirectGeneratorForm.closeCycle')}
          onClose={actions.closeCyclePanel}
        />
        <NoticePanel
          open={state.chainsPanelOpen}
          variant="warning"
          title={t('redirectGeneratorForm.collapsedChainsNoticeTitle')}
          items={state.collapsedChains}
          closeLabel={t('redirectGeneratorForm.closeChains')}
          onClose={actions.closeChainsPanel}
        />
      </div>
    </section>
  );
}
