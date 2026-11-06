import type { InputHTMLAttributes } from 'react';
import styles from './text-field.module.scss';

type TextFieldProps = {
  id: string;
  label: string;
} & InputHTMLAttributes<HTMLInputElement>;

export function TextField({ id, label, className, ...props }: TextFieldProps) {
  const classes = className ? `${styles.input} ${className}` : styles.input;
  return (
    <div className={styles.root}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input id={id} className={classes} {...props} />
    </div>
  );
}
