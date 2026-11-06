import type { SelectHTMLAttributes } from 'react';
import styles from './select.module.scss';

type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = {
  id: string;
  label: string;
  options: SelectOption[];
} & SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ id, label, options, className, ...props }: SelectProps) {
  const classes = className ? `${styles.select} ${className}` : styles.select;
  return (
    <label htmlFor={id} className={styles.label}>
      <span>{label}</span>
      <select id={id} className={classes} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
