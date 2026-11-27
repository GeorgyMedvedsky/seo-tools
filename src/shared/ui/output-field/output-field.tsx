import type { ReactNode } from 'react';
import styles from './output-field.module.scss';

type OutputFieldProps = {
  id: string;
  label: string;
  value: string;
  labelExtra?: ReactNode;
};

export function OutputField({ id, label, value, labelExtra }: OutputFieldProps) {
  const labelId = `${id}-label`;
  return (
    <div className={styles.wrapper}>
      <div className={styles.labelRow}>
        <h2 id={labelId} className={styles.label}>
          {label}
        </h2>
        {labelExtra}
      </div>
      <div className={styles.container}>
        <pre id={id} className={styles.output} aria-labelledby={labelId}>
          {value}
        </pre>
      </div>
    </div>
  );
}
