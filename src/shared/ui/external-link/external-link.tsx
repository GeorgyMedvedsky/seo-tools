import type { AnchorHTMLAttributes } from 'react';
import styles from './external-link.module.scss';

type ExternalLinkProps = AnchorHTMLAttributes<HTMLAnchorElement>;

export function ExternalLink({ className, children, ...props }: ExternalLinkProps) {
  const classes = className ? `${styles.link} ${className}` : styles.link;
  return (
    <a target="_blank" rel="noopener noreferrer" className={classes} {...props}>
      {children}
    </a>
  );
}
