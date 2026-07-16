import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RecommendedList } from './RecommendedList';
import type { RecommendationStatus } from '@/api/recommendations';
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

/** A pending row by default; pass status fields to exercise Estado. */
function row(
  over: Partial<RecommendedItem>,
  status: Partial<Omit<RecommendationStatus, 'item'>> = {},
): RecommendationStatus {
  return {
    item: item(over),
    is_covered: false,
    is_due: true,
    is_expired: false,
    covered_on: null,
    ...status,
  };
}

const categoryNames = new Map([['cat-1', 'Comida']]);

describe('RecommendedList', () => {
  it('renders the category name and formatted expected amount', () => {
    render(
      <RecommendedList
        rows={[row({ category_id: 'cat-1', description: 'Súper', expected_amount_cents: 15_050 })]}
        categoryNameById={categoryNames}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Comida')).toBeInTheDocument();
    expect(screen.getByText('$150.50')).toBeInTheDocument();
  });

  it('shows the repeat label beside the window', () => {
    render(
      <RecommendedList
        rows={[row({ description: 'Súper', repeat_mode: 'monthly' })]}
        categoryNameById={categoryNames}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Cada mes')).toBeInTheDocument();
  });

  it('omits the day from a repeating window, which matching ignores', () => {
    render(
      <RecommendedList
        rows={[row({ description: 'Súper', repeat_mode: 'monthly', window_start: '2026-06-14' }),
        ]}
        categoryNameById={categoryNames}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Desde jun 2026')).toBeInTheDocument();
    expect(screen.queryByText(/14/)).not.toBeInTheDocument();
  });

  it('renders a titled header when given one, so the page can show two lists', () => {
    render(
      <RecommendedList
        title="Pendientes"
        rows={[row({ description: 'Súper' })]}
        categoryNameById={categoryNames}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Pendientes')).toBeInTheDocument();
  });

  it('shows "Sin categoría" for a category-less item', () => {
    render(
      <RecommendedList
        rows={[row({ description: 'Bono' })]}
        categoryNameById={categoryNames}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Sin categoría')).toBeInTheDocument();
  });

  it('reports when a covered item was registered, not just that it was', () => {
    render(
      <RecommendedList
        rows={[
          row(
            { description: 'Pasaporte', repeat_mode: 'none' },
            { is_covered: true, is_due: false, covered_on: '2025-08-14' },
          ),
        ]}
        categoryNameById={categoryNames}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Registrada el 14 ago 2025')).toBeInTheDocument();
  });

  it('marks an expired item as vencida', () => {
    render(
      <RecommendedList
        rows={[row({ description: 'Vieja' }, { is_due: false, is_expired: true })]}
        categoryNameById={categoryNames}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Vencida')).toBeInTheDocument();
  });

  it('prefers the registered date over vencida when a covered item also expired', () => {
    render(
      <RecommendedList
        rows={[
          row(
            { description: 'Ambas' },
            { is_covered: true, is_due: false, is_expired: true, covered_on: '2026-07-02' },
          ),
        ]}
        categoryNameById={categoryNames}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Registrada el 02 jul 2026')).toBeInTheDocument();
    expect(screen.queryByText('Vencida')).not.toBeInTheDocument();
  });

  it('marks an uncovered, unexpired item as pendiente', () => {
    render(
      <RecommendedList
        rows={[row({ description: 'Agua' })]}
        categoryNameById={categoryNames}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('renders an empty state when there are no items', () => {
    render(
      <RecommendedList
        rows={[]}
        categoryNameById={categoryNames}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Sin recomendaciones')).toBeInTheDocument();
  });
});
