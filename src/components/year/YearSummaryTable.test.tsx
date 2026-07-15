import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { YearSummaryTable } from './YearSummaryTable';
import type { YearMonthSummary } from '@/api/yearSummary';

function zeroRow(month: number): YearMonthSummary {
  return {
    month,
    income_cents: 0,
    expense_cents: 0,
    balance_cents: 0,
    invested_cents: 0,
  };
}

/** 12 rows with activity only in January and March. */
function sampleRows(): YearMonthSummary[] {
  const rows = Array.from({ length: 12 }, (_, i) => zeroRow(i + 1));
  rows[0] = { month: 1, income_cents: 100_000, expense_cents: 40_000, balance_cents: 60_000, invested_cents: 25_000 };
  rows[2] = { month: 3, income_cents: 50_000, expense_cents: 70_000, balance_cents: -20_000, invested_cents: 0 };
  return rows;
}

describe('YearSummaryTable', () => {
  it('renders all twelve month rows plus a totals footer', () => {
    render(<YearSummaryTable rows={sampleRows()} />);

    // 12 month rows + 1 footer row (thead row is a separate <tr>).
    expect(screen.getByRole('row', { name: /Enero/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Diciembre/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Total/ })).toBeInTheDocument();
  });

  it('sums each column into the totals footer', () => {
    render(<YearSummaryTable rows={sampleRows()} />);

    const footer = screen.getByRole('row', { name: /Total/ });
    // income 1000.00 + 500.00 = 1500.00; expense 400.00 + 700.00 = 1100.00;
    // balance 600.00 - 200.00 = 400.00; invested 250.00.
    expect(within(footer).getByText('$1,500.00')).toBeInTheDocument();
    expect(within(footer).getByText('$1,100.00')).toBeInTheDocument();
    expect(within(footer).getByText('$400.00')).toBeInTheDocument();
    expect(within(footer).getByText('$250.00')).toBeInTheDocument();
  });
});
