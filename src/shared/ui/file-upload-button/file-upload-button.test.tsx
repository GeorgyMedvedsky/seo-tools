import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUploadButton } from './file-upload-button';

function getFileInput(): HTMLInputElement {
  return document.querySelector('input[type="file"]') as HTMLInputElement;
}

describe('FileUploadButton', () => {
  it('reads the selected file and calls onFileText with its contents', async () => {
    const user = userEvent.setup();
    const onFileText = vi.fn();
    render(<FileUploadButton label="Upload file" onFileText={onFileText} />);

    const file = new File(['https://a.com/x\n'], 'list.csv', { type: 'text/csv' });
    await user.upload(getFileInput(), file);

    expect(onFileText).toHaveBeenCalledWith('https://a.com/x\n');
  });

  it('calls onError instead of onFileText when reading the file fails', async () => {
    const user = userEvent.setup();
    const onFileText = vi.fn();
    const onError = vi.fn();
    render(<FileUploadButton label="Upload file" onFileText={onFileText} onError={onError} />);

    const file = new File(['content'], 'list.csv', { type: 'text/csv' });
    vi.spyOn(file, 'text').mockRejectedValue(new Error('read failed'));

    await user.upload(getFileInput(), file);

    expect(onError).toHaveBeenCalled();
    expect(onFileText).not.toHaveBeenCalled();
  });

  it('does nothing when the file picker is dismissed without choosing a file', () => {
    const onFileText = vi.fn();
    render(<FileUploadButton label="Upload file" onFileText={onFileText} />);

    fireEvent.change(getFileInput(), { target: { files: [] } });

    expect(onFileText).not.toHaveBeenCalled();
  });

  it('clicking the visible button triggers the hidden file input', async () => {
    const user = userEvent.setup();
    render(<FileUploadButton label="Upload file" onFileText={vi.fn()} />);
    const clickSpy = vi.spyOn(getFileInput(), 'click');

    await user.click(screen.getByRole('button', { name: 'Upload file' }));

    expect(clickSpy).toHaveBeenCalled();
  });
});
