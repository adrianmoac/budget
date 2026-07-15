import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CategoryList } from './CategoryList';
import type { Category } from '@/domain/types';

function cat(overrides: Partial<Category>): Category {
  return {
    id: crypto.randomUUID(),
    user_id: 'u',
    name: 'X',
    kind: 'normal',
    created_at: '',
    ...overrides,
  };
}

describe('CategoryList', () => {
  it('disables edit and delete for protected system categories (FR-5)', () => {
    const categories = [
      cat({ name: 'Comida', kind: 'normal' }),
      cat({ name: 'Otros', kind: 'otros' }),
      cat({ name: 'Deuda', kind: 'debt' }),
    ];
    render(<CategoryList categories={categories} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByLabelText('Editar categoría Comida')).toBeEnabled();
    expect(screen.getByLabelText('Eliminar categoría Otros')).toBeDisabled();
    expect(screen.getByLabelText('Editar categoría Otros')).toBeDisabled();
    expect(screen.getByLabelText('Eliminar categoría Deuda')).toBeDisabled();
  });
});
