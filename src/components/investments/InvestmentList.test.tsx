import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InvestmentList } from './InvestmentList';
import type { Investment } from '@/domain/types';

vi.mock('@/hooks/useInvestments', () => ({
  useUpdateMarketValue: () => ({ mutate: vi.fn(), isPending: false }),
}));

const vehicle = (over: Partial<Investment>): Investment => ({
  id: 'inv-1',
  user_id: 'u',
  name: 'GBM',
  contributed_total_cents: 0,
  market_value_cents: 0,
  created_at: '',
  ...over,
});

function renderList(investments: Investment[]) {
  render(
    <InvestmentList
      investments={investments}
      onAddContribution={vi.fn()}
      onViewHistory={vi.fn()}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
    />,
  );
}

describe('InvestmentList interest', () => {
  it('shows the per-vehicle interest percentage when there is investment', () => {
    // contributed 1000.00, market 1100.00 → +100.00 (+10.00%)
    renderList([vehicle({ contributed_total_cents: 100_000, market_value_cents: 110_000 })]);

    expect(screen.getByText(/\+10\.00%/)).toBeInTheDocument();
  });

  it('hides the percentage with a tooltip when nothing is contributed (guard)', () => {
    renderList([vehicle({ contributed_total_cents: 0, market_value_cents: 0 })]);

    expect(screen.queryByText(/%\)/)).not.toBeInTheDocument();
    expect(screen.getByTitle('Sin inversiones aún')).toBeInTheDocument();
  });
});

describe('InvestmentList delete guard', () => {
  it('disables delete for a vehicle with contributions (ON DELETE RESTRICT)', () => {
    renderList([vehicle({ name: 'Cetes', contributed_total_cents: 5000 })]);

    expect(screen.getByRole('button', { name: 'Eliminar Cetes' })).toBeDisabled();
  });

  it('enables delete for a vehicle with no contributions', () => {
    renderList([vehicle({ name: 'Cetes', contributed_total_cents: 0 })]);

    expect(screen.getByRole('button', { name: 'Eliminar Cetes' })).toBeEnabled();
  });
});
