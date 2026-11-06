import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';
import styles from './button.module.scss';

describe('Button', () => {
  it('renders as a primary button by default', () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole('button', { name: 'Click' })).toHaveClass(styles.primary);
  });

  it('applies the secondary variant class', () => {
    render(<Button variant="secondary">Click</Button>);
    expect(screen.getByRole('button', { name: 'Click' })).toHaveClass(styles.secondary);
  });

  it('applies the ghost variant class', () => {
    render(<Button variant="ghost">Click</Button>);
    expect(screen.getByRole('button', { name: 'Click' })).toHaveClass(styles.ghost);
  });

  it('merges a custom className with the variant class', () => {
    render(<Button className="custom">Click</Button>);
    expect(screen.getByRole('button', { name: 'Click' })).toHaveClass('custom', styles.primary);
  });

  it('fires onClick when pressed', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);

    await user.click(screen.getByRole('button', { name: 'Click' }));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
