import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InvestedSummaryCard } from './InvestedSummaryCard';
import type { Investment } from '@/domain/types';

const investments = vi.hoisted<{ value: Investment[] }>(() => ({ value: [] }));

vi.mock('@/hooks/useInvestments', () => ({
  useInvestments: () => ({
    data: investments.value,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useUpdateMarketValue: () => ({ mutate: vi.fn(), isPending: false }),
}));

function setState(invs: Investment[]) {
  investments.value = invs;
}

const vehicle = (over: Partial<Investment>): Investment => ({
  id: 'inv-1',
  user_id: 'u',
  name: 'GBM',
  contributed_total_cents: 0,
  market_value_cents: 0,
  created_at: '',
  ...over,
});

describe('InvestedSummaryCard total invested', () => {
  it('sums contributed_total_cents across vehicles rather than reading the totals row', () => {
    // Arrange: two vehicles whose contributed totals sum to $3,000.00.
    setState([
      vehicle({ id: 'a', name: 'GBM', contributed_total_cents: 200_000 }),
      vehicle({ id: 'b', name: 'Cetes', contributed_total_cents: 100_000 }),
    ]);

    // Act
    render(<InvestedSummaryCard />);

    // Assert: the headline equals the sum of the vehicle rows beneath it. This is
    // the guard against regressing to totals.total_invested_cents, which can sit at
    // 0 while the vehicles hold real contributions.
    expect(screen.getByText('$3,000.00')).toBeInTheDocument();
  });
});

describe('InvestedSummaryCard interest guard (AC-Interest-zero)', () => {
  it('hides the percentage and shows a tooltip when nothing is invested', () => {
    setState([vehicle({ market_value_cents: 0, contributed_total_cents: 0 })]);
    render(<InvestedSummaryCard />);

    // No percentage rendered; the em-dash placeholder carries the tooltip.
    expect(screen.queryByText(/%\)/)).not.toBeInTheDocument();
    expect(screen.getByTitle('Sin inversiones aún')).toBeInTheDocument();
  });

  it('shows the interest percentage when there is investment', () => {
    setState([vehicle({ market_value_cents: 110_000, contributed_total_cents: 100_000 })]);
    render(<InvestedSummaryCard />);

    // +10.00% appears (grand-total row).
    expect(screen.getAllByText(/\+10\.00%/).length).toBeGreaterThan(0);
  });
});
