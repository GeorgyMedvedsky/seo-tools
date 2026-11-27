import { describe, expect, it } from 'vitest';
import { getDownloadFilename } from './download-filename';

describe('getDownloadFilename', () => {
  it('returns redirects.conf for nginx', () => {
    expect(getDownloadFilename('nginx')).toBe('redirects.conf');
  });

  it('returns .htaccess for apache', () => {
    expect(getDownloadFilename('apache')).toBe('.htaccess');
  });
});
