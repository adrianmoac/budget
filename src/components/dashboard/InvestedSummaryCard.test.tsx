import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InvestedSummaryCard } from './InvestedSummaryCard';
import type { Investment, Totals } from '@/domain/types';

const investments = vi.hoisted<{ value: Investment[] }>(() => ({ value: [] }));
const totals = vi.hoisted<{ value: Totals }>(() => ({
  value: { user_id: 'u', liquid_cash_cents: 0, total_invested_cents: 0, updated_at: '' },
}));

vi.mock('@/hooks/useInvestments', () => ({
  useInvestments: () => ({
    data: investments.value,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useUpdateMarketValue: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useTotals', () => ({
  useTotals: () => ({
    data: totals.value,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

function setState(invs: Investment[], invested: number) {
  investments.value = invs;
  totals.value = {
    user_id: 'u',
    liquid_cash_cents: 0,
    total_invested_cents: invested,
    updated_at: '',
  };
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

describe('InvestedSummaryCard interest guard (AC-Interest-zero)', () => {
  it('hides the percentage and shows a tooltip when nothing is invested', () => {
    setState([vehicle({ market_value_cents: 0, contributed_total_cents: 0 })], 0);
    render(<InvestedSummaryCard />);

    // No percentage rendered; the em-dash placeholder carries the tooltip.
    expect(screen.queryByText(/%\)/)).not.toBeInTheDocument();
    expect(screen.getByTitle('Sin inversiones aún')).toBeInTheDocument();
  });

  it('shows the interest percentage when there is investment', () => {
    setState(
      [vehicle({ market_value_cents: 110_000, contributed_total_cents: 100_000 })],
      100_000,
    );
    render(<InvestedSummaryCard />);

    // +10.00% appears (grand-total row).
    expect(screen.getAllByText(/\+10\.00%/).length).toBeGreaterThan(0);
  });
});
