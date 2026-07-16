import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RecommendedList } from './RecommendedList';
import type { RecommendedItem } from '@/domain/types';

function item(over: Partial<RecommendedItem>): RecommendedItem {
  return {
    id: 'r1',
    user_id: 'u',
    type: 'expense',
    category_id: null,
    description: '',
    expected_amount_cents: null,
    window_start: '2026-01-01',
    window_end: null,
    repeat_mode: 'monthly',
    created_at: '',
    ...over,
  };
}

const categoryNames = new Map([['cat-1', 'Comida']]);

describe('RecommendedList', () => {
  it('renders the category name and formatted expected amount', () => {
    render(
      <RecommendedList
        items={[item({ category_id: 'cat-1', description: 'Súper', expected_amount_cents: 15_050 })]}
        categoryNameById={categoryNames}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Comida')).toBeInTheDocument();
    expect(screen.getByText('$150.50')).toBeInTheDocument();
  });

  it('shows "Sin categoría" for a category-less item', () => {
    render(
      <RecommendedList
        items={[item({ description: 'Bono' })]}
        categoryNameById={categoryNames}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Sin categoría')).toBeInTheDocument();
  });

  it('renders an empty state when there are no items', () => {
    render(
      <RecommendedList
        items={[]}
        categoryNameById={categoryNames}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Sin recomendaciones')).toBeInTheDocument();
  });
});
