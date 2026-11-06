import { AlertCircle, AlertTriangle, X } from 'lucide-react';
import { useEscapeKey } from 'shared/lib/hooks';
import styles from './notice-panel.module.scss';

type NoticePanelProps = {
  open: boolean;
  variant: 'warning' | 'error';
  title: string;
  items: string[];
  closeLabel: string;
  onClose: () => void;
};

const VARIANT_ICON = {
  warning: AlertTriangle,
  error: AlertCircle,
};

export function NoticePanel({
  open,
  variant,
  title,
  items,
  closeLabel,
  onClose,
}: NoticePanelProps) {
  useEscapeKey(onClose, open);

  const variantClass = variant === 'error' ? styles.error : styles.warning;
  const panelClasses = open
    ? `${styles.panel} ${variantClass} ${styles.open}`
    : `${styles.panel} ${variantClass}`;
  const Icon = VARIANT_ICON[variant];

  return (
    <div className={panelClasses} role="alert" aria-hidden={!open} inert={!open}>
      <button type="button" className={styles.close} onClick={onClose} aria-label={closeLabel}>
        <X size={16} aria-hidden="true" />
      </button>
      <div className={styles.content}>
        <div className={styles.heading}>
          <Icon size={18} className={styles.icon} aria-hidden="true" />
          <h3 className={styles.title}>{title}</h3>
        </div>
        {items.map((item) => (
          <p key={item} className={styles.item}>
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}
