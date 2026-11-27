import type { ReactNode } from 'react';
import { Link } from 'react-router';
import styles from './card.module.scss';

type CardProps = {
  to: string;
  icon: ReactNode;
  title: string;
  description: string;
};

export function Card({ to, icon, title, description }: CardProps) {
  return (
    <Link to={to} className={styles.card}>
      <div className={styles.icon}>{icon}</div>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.description}>{description}</p>
    </Link>
  );
}
