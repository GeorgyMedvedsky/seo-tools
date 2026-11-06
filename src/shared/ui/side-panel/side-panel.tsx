import type { ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useClickOutside, useEscapeKey, useFocusTrap } from 'shared/lib/hooks';
import styles from './side-panel.module.scss';

type SidePanelProps = {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  toggleLabel: string;
  children: ReactNode;
};

export function SidePanel({ open, onToggle, onClose, toggleLabel, children }: SidePanelProps) {
  const ref = useClickOutside<HTMLElement>(onClose);
  useEscapeKey(onClose, open);
  useFocusTrap(ref, open);
  const classes = open ? `${styles.panel} ${styles.open}` : styles.panel;

  return (
    <section ref={ref} className={classes}>
      <button
        type="button"
        className={styles.bookmark}
        onClick={onToggle}
        aria-expanded={open}
        aria-label={toggleLabel}
      >
        <SlidersHorizontal size={20} aria-hidden="true" />
      </button>
      <div className={styles.content} inert={!open}>
        {children}
      </div>
    </section>
  );
}
