import { useCallback, useReducer } from 'react';
import { useTranslation } from 'react-i18next';
import { getDownloadFilename, type RedirectTemplate } from 'entities/redirect';
import { useClipboard, useTimedNotification } from 'shared/lib/hooks';
import { downloadTextFile } from 'shared/lib/utils';
import { generatorReducer, initialState } from './reducer';
import type { GeneratorMode } from './types';

export type GenerateRedirectsController = ReturnType<typeof useGenerateRedirects>;

export function useGenerateRedirects() {
  const [state, dispatch] = useReducer(generatorReducer, initialState);
  const { copy } = useClipboard();
  const { message: notification, notify, clear: clearNotification } = useTimedNotification();
  const { t } = useTranslation();

  const setMode = useCallback(
    (value: GeneratorMode) => dispatch({ type: 'mode/change', payload: value }),
    [],
  );
  const setUrlsInput = useCallback(
    (value: string) => dispatch({ type: 'urlsInput/change', payload: value }),
    [],
  );
  const setTargetUrl = useCallback(
    (value: string) => dispatch({ type: 'targetUrl/change', payload: value }),
    [],
  );
  const setPairsInput = useCallback(
    (value: string) => dispatch({ type: 'pairsInput/change', payload: value }),
    [],
  );
  const setTemplate = useCallback(
    (value: RedirectTemplate) => dispatch({ type: 'template/change', payload: value }),
    [],
  );
  const setGrouped = useCallback(
    (value: boolean) => dispatch({ type: 'grouped/change', payload: value }),
    [],
  );
  const setMerge = useCallback(
    (value: boolean) => dispatch({ type: 'merge/change', payload: value }),
    [],
  );
  const generate = useCallback(() => dispatch({ type: 'generate' }), []);
  const closeWarningPanel = useCallback(() => dispatch({ type: 'warningPanel/close' }), []);
  const closeErrorPanel = useCallback(() => dispatch({ type: 'errorPanel/close' }), []);
  const closeConflictPanel = useCallback(() => dispatch({ type: 'conflictPanel/close' }), []);
  const closeCyclePanel = useCallback(() => dispatch({ type: 'cyclePanel/close' }), []);
  const closeChainsPanel = useCallback(() => dispatch({ type: 'chainsPanel/close' }), []);

  const reset = useCallback(() => {
    dispatch({ type: 'reset' });
    clearNotification();
  }, [clearNotification]);

  const copyOutput = useCallback(async () => {
    const ok = await copy(state.output);
    notify(ok ? t('generateRedirects.copied') : t('generateRedirects.copyFailed'));
  }, [copy, notify, state.output, t]);

  const notifyUploadFailed = useCallback(() => {
    notify(t('generateRedirects.uploadFailed'));
  }, [notify, t]);

  const downloadOutput = useCallback(() => {
    downloadTextFile(getDownloadFilename(state.template), state.output);
  }, [state.output, state.template]);

  return {
    state,
    notification,
    actions: {
      setMode,
      setUrlsInput,
      setTargetUrl,
      setPairsInput,
      setTemplate,
      setGrouped,
      setMerge,
      generate,
      closeWarningPanel,
      closeErrorPanel,
      closeConflictPanel,
      closeCyclePanel,
      closeChainsPanel,
      reset,
      copyOutput,
      downloadOutput,
      notifyUploadFailed,
    },
  };
}
