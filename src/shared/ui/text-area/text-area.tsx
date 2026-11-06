import type { TextareaHTMLAttributes } from 'react';
import styles from './text-area.module.scss';

type TextAreaProps = {
  id: string;
  label: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextArea({ id, label, className, ...props }: TextAreaProps) {
  const classes = className ? `${styles.textarea} ${className}` : styles.textarea;
  return (
    <div className={styles.root}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <textarea id={id} className={classes} {...props} />
    </div>
  );
}
