import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PeriodTotalsBar } from './PeriodTotalsBar';

describe('PeriodTotalsBar', () => {
  it('shows income, expense, balance and invested for an unfiltered period', () => {
    render(
      <PeriodTotalsBar
        incomeCents={100_000}
        expenseCents={40_000}
        balanceCents={60_000}
        investedCents={25_000}
      />,
    );

    expect(screen.getByText('Ingresos')).toBeInTheDocument();
    expect(screen.getByText('Balance')).toBeInTheDocument();
    expect(screen.getByText('$600.00')).toBeInTheDocument();
  });
});

describe('PeriodTotalsBar scoped to one category', () => {
  // Income carries no category (D11), so a category-scoped view has no income and
  // no meaningful balance. Rendering "Ingresos $0" beside a filtered expense total
  // would be a lie; the tiles are dropped instead.
  it('drops the income and balance tiles rather than showing a misleading zero', () => {
    render(
      <PeriodTotalsBar
        incomeCents={0}
        expenseCents={40_000}
        balanceCents={-40_000}
        investedCents={25_000}
        expensesOnly
      />,
    );

    expect(screen.queryByText('Ingresos')).not.toBeInTheDocument();
    expect(screen.queryByText('Balance')).not.toBeInTheDocument();
    expect(screen.getByText('Gastos (categoría)')).toBeInTheDocument();
    expect(screen.getByText('$400.00')).toBeInTheDocument();
  });

  it('keeps invested, which no table filter affects', () => {
    render(
      <PeriodTotalsBar
        incomeCents={0}
        expenseCents={40_000}
        balanceCents={-40_000}
        investedCents={25_000}
        expensesOnly
      />,
    );

    expect(screen.getByText('Invertido')).toBeInTheDocument();
    expect(screen.getByText('$250.00')).toBeInTheDocument();
  });
});
