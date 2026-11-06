export type RedirectTemplate = 'nginx' | 'apache';

export type GenerateRedirectsParams = {
  urls: string[];
  targetUrl: string;
  template: RedirectTemplate;
  grouped: boolean;
};

export type GenerateRedirectsResult =
  | {
      ok: true;
      output: string;
      subdomains: string[];
      unparseableUrls: string[];
      hasRedirects: boolean;
    }
  | {
      ok: false;
      error: 'invalid-target-url';
    };
