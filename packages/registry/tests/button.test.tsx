import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '../src/ui/button';

describe('Button', () => {
  it('renders a button with the default variant and data-slot attribute', () => {
    render(<Button>Press</Button>);
    const el = screen.getByRole('button', { name: 'Press' });
    expect(el).toHaveAttribute('data-slot', 'button');
    expect(el.className).toContain('bg-primary');
  });

  it('applies the outline variant classes', () => {
    render(<Button variant="outline">Out</Button>);
    expect(screen.getByRole('button')).toHaveClass('border-input');
  });

  it('renders the child element via asChild', () => {
    render(
      <Button asChild>
        <a href="/docs">Docs</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Docs' });
    expect(link).toHaveAttribute('href', '/docs');
    expect(link).toHaveAttribute('data-slot', 'button');
  });

  it('merges custom className without losing variant classes', () => {
    render(<Button className="mt-4">M</Button>);
    const el = screen.getByRole('button');
    expect(el).toHaveClass('mt-4');
    expect(el).toHaveClass('bg-primary');
  });

  it('forwards native props (disabled)', () => {
    render(<Button disabled>Can't</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
