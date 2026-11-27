import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import { useClickOutside, useEscapeKey } from 'shared/lib/hooks';
import styles from './select.module.scss';

type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = {
  id: string;
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
};

const TYPEAHEAD_RESET_MS = 500;

export function Select({ id, label, options, value, onChange }: SelectProps) {
  const labelId = `${id}-label`;
  const valueId = `${id}-value`;
  const listboxId = `${id}-listbox`;
  const optionId = (index: number) => `${id}-option-${index}`;

  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(
    options.findIndex((option) => option.value === value),
    0,
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const typeahead = useRef({ query: '', timeout: 0 });

  const close = () => setOpen(false);
  const ref = useClickOutside<HTMLDivElement>(close);
  useEscapeKey(close, open);

  function openListbox() {
    setActiveIndex(selectedIndex);
    setOpen(true);
  }

  function commitOption(index: number) {
    onChange(options[index].value);
    setOpen(false);
  }

  function handleTypeAhead(char: string) {
    window.clearTimeout(typeahead.current.timeout);
    typeahead.current.query += char.toLowerCase();
    const query = typeahead.current.query;
    const matchIndex = options.findIndex((option) => option.label.toLowerCase().startsWith(query));

    if (matchIndex !== -1) {
      if (open) {
        setActiveIndex(matchIndex);
      } else {
        commitOption(matchIndex);
      }
    }

    typeahead.current.timeout = window.setTimeout(() => {
      typeahead.current.query = '';
    }, TYPEAHEAD_RESET_MS);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) {
          openListbox();
        } else {
          setActiveIndex((index) => (index + 1) % options.length);
        }
        return;
      case 'ArrowUp':
        event.preventDefault();
        if (!open) {
          openListbox();
        } else {
          setActiveIndex((index) => (index - 1 + options.length) % options.length);
        }
        return;
      case 'Home':
        if (open) {
          event.preventDefault();
          setActiveIndex(0);
        }
        return;
      case 'End':
        if (open) {
          event.preventDefault();
          setActiveIndex(options.length - 1);
        }
        return;
      case 'Enter':
      case ' ':
        if (open) {
          event.preventDefault();
          commitOption(activeIndex);
        }
        return;
      default:
        if (event.key.length === 1) {
          handleTypeAhead(event.key);
        }
    }
  }

  const activeOptionId = open ? optionId(activeIndex) : optionId(selectedIndex);
  const listboxClasses = open ? `${styles.listbox} ${styles.open}` : styles.listbox;

  return (
    <div ref={ref} className={styles.root}>
      <span id={labelId} className={styles.label}>
        {label}
      </span>
      <button
        type="button"
        id={id}
        className={styles.trigger}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={activeOptionId}
        aria-labelledby={`${labelId} ${valueId}`}
        onClick={() => (open ? setOpen(false) : openListbox())}
        onKeyDown={handleKeyDown}
      >
        <span id={valueId}>{options[selectedIndex]?.label ?? ''}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={open ? `${styles.chevron} ${styles.chevronOpen}` : styles.chevron}
        />
      </button>
      <ul id={listboxId} role="listbox" className={listboxClasses}>
        {options.map((option, index) => {
          const isActive = open && index === activeIndex;
          return (
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- options are never focusable; all keyboard interaction is handled on the combobox button via aria-activedescendant
            <li
              key={option.value}
              id={optionId(index)}
              role="option"
              aria-selected={option.value === value}
              className={isActive ? `${styles.option} ${styles.active}` : styles.option}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => commitOption(index)}
            >
              {option.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
