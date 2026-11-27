import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Upload } from 'lucide-react';
import { Button } from 'shared/ui/button';
import styles from './file-upload-button.module.scss';

type FileUploadButtonProps = {
  label: string;
  accept?: string;
  onFileText: (text: string) => void;
  onError?: () => void;
};

export function FileUploadButton({ label, accept, onFileText, onError }: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      onFileText(await file.text());
    } catch {
      onError?.();
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className={styles.hiddenInput}
        onChange={(event) => void handleChange(event)}
      />
      <Button variant="secondary" onClick={() => inputRef.current?.click()}>
        <Upload size={16} aria-hidden="true" />
        {label}
      </Button>
    </>
  );
}
