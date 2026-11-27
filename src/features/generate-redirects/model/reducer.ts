import { generateRedirectPairs, generateRedirects } from 'entities/redirect';
import type { GeneratorAction, GeneratorState } from './types';

export const initialState: GeneratorState = {
  mode: 'single',
  urlsInput: '',
  targetUrl: '',
  pairsInput: '',
  template: 'nginx',
  grouped: false,
  merge: true,
  output: '',
  subdomains: [],
  unparseableUrls: [],
  conflictingSources: [],
  redirectCycles: [],
  collapsedChains: [],
  targetUrlError: null,
  nothingToRedirect: false,
  warningPanelOpen: false,
  errorPanelOpen: false,
  conflictPanelOpen: false,
  cyclePanelOpen: false,
  chainsPanelOpen: false,
};

function withClearedResult(state: GeneratorState): GeneratorState {
  return {
    ...state,
    output: '',
    subdomains: [],
    unparseableUrls: [],
    conflictingSources: [],
    redirectCycles: [],
    collapsedChains: [],
    nothingToRedirect: false,
    warningPanelOpen: false,
    errorPanelOpen: false,
    conflictPanelOpen: false,
    cyclePanelOpen: false,
    chainsPanelOpen: false,
  };
}

function generateSingle(state: GeneratorState): GeneratorState {
  const trimmedTargetUrl = state.targetUrl.trim();
  if (!trimmedTargetUrl) {
    return { ...withClearedResult(state), targetUrlError: 'required' };
  }

  const result = generateRedirects({
    urls: state.urlsInput.split('\n'),
    targetUrl: trimmedTargetUrl,
    template: state.template,
    grouped: state.grouped,
    merge: state.merge,
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
    conflictingSources: [],
    redirectCycles: [],
    collapsedChains: [],
    nothingToRedirect: !result.hasRedirects,
    warningPanelOpen: result.subdomains.length > 0,
    errorPanelOpen: result.unparseableUrls.length > 0,
    conflictPanelOpen: false,
    cyclePanelOpen: false,
    chainsPanelOpen: false,
  };
}

function generatePairs(state: GeneratorState): GeneratorState {
  const result = generateRedirectPairs({
    lines: state.pairsInput.split('\n'),
    template: state.template,
    merge: state.merge,
  });

  return {
    ...state,
    targetUrlError: null,
    output: result.output,
    subdomains: [],
    unparseableUrls: result.unparseableLines,
    conflictingSources: result.conflictingSources,
    redirectCycles: result.redirectCycles,
    collapsedChains: result.collapsedChains,
    nothingToRedirect: !result.hasRedirects,
    warningPanelOpen: false,
    errorPanelOpen: result.unparseableLines.length > 0,
    conflictPanelOpen: result.conflictingSources.length > 0,
    cyclePanelOpen: result.redirectCycles.length > 0,
    chainsPanelOpen: result.collapsedChains.length > 0,
  };
}

export function generatorReducer(state: GeneratorState, action: GeneratorAction): GeneratorState {
  switch (action.type) {
    case 'mode/change':
      return { ...withClearedResult(state), mode: action.payload, targetUrlError: null };

    case 'urlsInput/change':
      return { ...state, urlsInput: action.payload, nothingToRedirect: false };

    case 'targetUrl/change':
      return { ...state, targetUrl: action.payload, targetUrlError: null };

    case 'pairsInput/change':
      return { ...state, pairsInput: action.payload, nothingToRedirect: false };

    case 'template/change':
      return { ...state, template: action.payload };

    case 'grouped/change':
      return { ...state, grouped: action.payload };

    case 'merge/change':
      return { ...state, merge: action.payload };

    case 'generate':
      return state.mode === 'single' ? generateSingle(state) : generatePairs(state);

    case 'warningPanel/close':
      return { ...state, warningPanelOpen: false };

    case 'errorPanel/close':
      return { ...state, errorPanelOpen: false };

    case 'conflictPanel/close':
      return { ...state, conflictPanelOpen: false };

    case 'cyclePanel/close':
      return { ...state, cyclePanelOpen: false };

    case 'chainsPanel/close':
      return { ...state, chainsPanelOpen: false };

    case 'reset':
      return initialState;

    default:
      return state;
  }
}
