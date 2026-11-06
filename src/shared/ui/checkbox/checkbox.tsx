import type { InputHTMLAttributes } from 'react';
import styles from './checkbox.module.scss';

type CheckboxProps = {
  id: string;
  label: string;
} & InputHTMLAttributes<HTMLInputElement>;

export function Checkbox({ id, label, ...props }: CheckboxProps) {
  return (
    <div className={styles.row}>
      <label htmlFor={id} className={styles.text}>
        {label}
      </label>
      <input type="checkbox" id={id} className={styles.checkbox} {...props} />
    </div>
  );
}
