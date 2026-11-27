import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { useClickOutside, useEscapeKey } from 'shared/lib/hooks';
import styles from './info-popover.module.scss';

type InfoPopoverProps = {
  label: string;
  children: ReactNode;
};

export function InfoPopover({ label, children }: InfoPopoverProps) {
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const close = () => setOpen(false);
  const ref = useClickOutside<HTMLDivElement>(close);
  useEscapeKey(close, open);

  const popoverClasses = open ? `${styles.popover} ${styles.open}` : styles.popover;

  return (
    <div ref={ref} className={styles.root}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
      >
        <Info size={16} aria-hidden="true" />
      </button>
      <div id={popoverId} className={popoverClasses} inert={!open}>
        {children}
      </div>
    </div>
  );
}
