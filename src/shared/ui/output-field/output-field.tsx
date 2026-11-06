import styles from './output-field.module.scss';

type OutputFieldProps = {
  id: string;
  label: string;
  value: string;
};

export function OutputField({ id, label, value }: OutputFieldProps) {
  const labelId = `${id}-label`;
  return (
    <div className={styles.wrapper}>
      <h2 id={labelId} className={styles.label}>
        {label}
      </h2>
      <div className={styles.container}>
        <pre id={id} className={styles.output} aria-labelledby={labelId}>
          {value}
        </pre>
      </div>
    </div>
  );
}
