import { useCallback, useReducer } from 'react';
import { useTranslation } from 'react-i18next';
import type { RedirectTemplate } from 'entities/redirect';
import { useClipboard, useTimedNotification } from 'shared/lib/hooks';
import { downloadTextFile } from 'shared/lib/utils';
import { generatorReducer, initialState } from './reducer';

export type GenerateRedirectsController = ReturnType<typeof useGenerateRedirects>;

export function useGenerateRedirects() {
  const [state, dispatch] = useReducer(generatorReducer, initialState);
  const { copy } = useClipboard();
  const { message: notification, notify, clear: clearNotification } = useTimedNotification();
  const { t } = useTranslation();

  const setUrlsInput = useCallback(
    (value: string) => dispatch({ type: 'urlsInput/change', payload: value }),
    [],
  );
  const setTargetUrl = useCallback(
    (value: string) => dispatch({ type: 'targetUrl/change', payload: value }),
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
  const generate = useCallback(() => dispatch({ type: 'generate' }), []);
  const closeWarningPanel = useCallback(() => dispatch({ type: 'warningPanel/close' }), []);
  const closeErrorPanel = useCallback(() => dispatch({ type: 'errorPanel/close' }), []);

  const reset = useCallback(() => {
    dispatch({ type: 'reset' });
    clearNotification();
  }, [clearNotification]);

  const copyOutput = useCallback(async () => {
    const ok = await copy(state.output);
    notify(ok ? t('generateRedirects.copied') : t('generateRedirects.copyFailed'));
  }, [copy, notify, state.output, t]);

  const downloadOutput = useCallback(() => {
    downloadTextFile('redirects.conf', state.output);
  }, [state.output]);

  return {
    state,
    notification,
    actions: {
      setUrlsInput,
      setTargetUrl,
      setTemplate,
      setGrouped,
      generate,
      closeWarningPanel,
      closeErrorPanel,
      reset,
      copyOutput,
      downloadOutput,
    },
  };
}
