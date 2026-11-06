import { generateRedirects } from 'entities/redirect';
import type { GeneratorAction, GeneratorState } from './types';

export const initialState: GeneratorState = {
  urlsInput: '',
  targetUrl: '',
  template: 'nginx',
  grouped: false,
  output: '',
  subdomains: [],
  unparseableUrls: [],
  targetUrlError: null,
  nothingToRedirect: false,
  warningPanelOpen: false,
  errorPanelOpen: false,
};

function withClearedResult(state: GeneratorState): GeneratorState {
  return {
    ...state,
    output: '',
    subdomains: [],
    unparseableUrls: [],
    nothingToRedirect: false,
    warningPanelOpen: false,
    errorPanelOpen: false,
  };
}

export function generatorReducer(state: GeneratorState, action: GeneratorAction): GeneratorState {
  switch (action.type) {
    case 'urlsInput/change':
      return { ...state, urlsInput: action.payload, nothingToRedirect: false };

    case 'targetUrl/change':
      return { ...state, targetUrl: action.payload, targetUrlError: null };

    case 'template/change':
      return { ...state, template: action.payload };

    case 'grouped/change':
      return { ...state, grouped: action.payload };

    case 'generate': {
      const trimmedTargetUrl = state.targetUrl.trim();
      if (!trimmedTargetUrl) {
        return { ...withClearedResult(state), targetUrlError: 'required' };
      }

      const result = generateRedirects({
        urls: state.urlsInput.split('\n'),
        targetUrl: trimmedTargetUrl,
        template: state.template,
        grouped: state.grouped,
      });

      if (!result.ok) {
        return { ...withClearedResult(state), targetUrlError: 'invalid' };
      }

      return {
        ...state,
        targetUrlError: null,
        output: result.output,
        subdomains: result.subdomains,
        unparseableUrls: result.unparseableUrls,
        nothingToRedirect: !result.hasRedirects,
        warningPanelOpen: result.subdomains.length > 0,
        errorPanelOpen: result.unparseableUrls.length > 0,
      };
    }

    case 'warningPanel/close':
      return { ...state, warningPanelOpen: false };

    case 'errorPanel/close':
      return { ...state, errorPanelOpen: false };

    case 'reset':
      return initialState;

    default:
      return state;
  }
}
