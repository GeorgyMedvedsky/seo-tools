import type { RedirectTemplate } from '../model/types';

const DOWNLOAD_FILENAMES: Record<RedirectTemplate, string> = {
  nginx: 'redirects.conf',
  apache: '.htaccess',
};

export function getDownloadFilename(template: RedirectTemplate): string {
  return DOWNLOAD_FILENAMES[template];
}
