import type { RedirectTemplate } from 'entities/redirect';

export type TargetUrlError = 'required' | 'invalid';

export type GeneratorState = {
  urlsInput: string;
  targetUrl: string;
  template: RedirectTemplate;
  grouped: boolean;
  output: string;
  subdomains: string[];
  unparseableUrls: string[];
  targetUrlError: TargetUrlError | null;
  nothingToRedirect: boolean;
  warningPanelOpen: boolean;
  errorPanelOpen: boolean;
};

export type GeneratorAction =
  | { type: 'urlsInput/change'; payload: string }
  | { type: 'targetUrl/change'; payload: string }
  | { type: 'template/change'; payload: RedirectTemplate }
  | { type: 'grouped/change'; payload: boolean }
  | { type: 'generate' }
  | { type: 'warningPanel/close' }
  | { type: 'errorPanel/close' }
  | { type: 'reset' };
