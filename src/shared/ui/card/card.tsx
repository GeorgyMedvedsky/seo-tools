import { Link } from 'react-router';
import styles from './card.module.scss';

type CardProps = {
  to: string;
  title: string;
  description: string;
};

export function Card({ to, title, description }: CardProps) {
  return (
    <Link to={to} className={styles.card}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.description}>{description}</p>
    </Link>
  );
}
