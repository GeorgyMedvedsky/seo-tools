import type { RedirectTemplate } from 'entities/redirect';

export type TargetUrlError = 'required' | 'invalid';

export type GeneratorMode = 'single' | 'pairs';

export type GeneratorState = {
  mode: GeneratorMode;
  urlsInput: string;
  targetUrl: string;
  pairsInput: string;
  template: RedirectTemplate;
  grouped: boolean;
  output: string;
  subdomains: string[];
  unparseableUrls: string[];
  conflictingSources: string[];
  targetUrlError: TargetUrlError | null;
  nothingToRedirect: boolean;
  warningPanelOpen: boolean;
  errorPanelOpen: boolean;
  conflictPanelOpen: boolean;
};

export type GeneratorAction =
  | { type: 'mode/change'; payload: GeneratorMode }
  | { type: 'urlsInput/change'; payload: string }
  | { type: 'targetUrl/change'; payload: string }
  | { type: 'pairsInput/change'; payload: string }
  | { type: 'template/change'; payload: RedirectTemplate }
  | { type: 'grouped/change'; payload: boolean }
  | { type: 'generate' }
  | { type: 'warningPanel/close' }
  | { type: 'errorPanel/close' }
  | { type: 'conflictPanel/close' }
  | { type: 'reset' };
