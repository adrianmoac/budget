import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentDialog } from './PaymentDialog';
import { todayISOMX } from '@/domain/date';
import type { Debt, DebtPayment } from '@/domain/types';

const recordMutateAsync = vi.fn().mockResolvedValue({ covered_minimum: true });
let debtPaymentsData: DebtPayment[] = [];

vi.mock('@/hooks/useDebts', () => ({
  useRecordDebtPayment: () => ({ mutateAsync: recordMutateAsync }),
  useDebtPayments: () => ({ data: debtPaymentsData }),
}));

const debt: Debt = {
  id: 'd0000000-0000-0000-0000-000000000001',
  user_id: 'u1',
  name: 'Tarjeta',
  total_months: 6,
  remaining_months: 6,
  minimum_payment_cents: 50000,
  due_day: 15,
  start_date: '2026-01-01',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  recordMutateAsync.mockClear().mockResolvedValue({ covered_minimum: true });
  debtPaymentsData = [];
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PaymentDialog', () => {
  it('prefills the amount with the minimum and records the payment in centavos', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<PaymentDialog open onOpenChange={onOpenChange} debt={debt} />);

    expect(screen.getByLabelText('Monto')).toHaveValue(500);

    await user.click(screen.getByRole('button', { name: 'Registrar' }));

    await waitFor(() =>
      expect(recordMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ debt_id: debt.id, amount_cents: 50000 }),
      ),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('warns when a covering payment already exists this month (D6)', () => {
    debtPaymentsData = [
      {
        id: 'p1',
        user_id: 'u1',
        debt_id: debt.id,
        transaction_id: 't1',
        amount_cents: 50000,
        payment_date: todayISOMX(),
        covered_minimum: true,
        months_decremented: 1,
        created_at: '2026-03-15T00:00:00Z',
      },
    ];

    render(<PaymentDialog open onOpenChange={vi.fn()} debt={debt} />);

    expect(
      screen.getByText(/Ya existe un pago que cubre el mínimo este mes/),
    ).toBeInTheDocument();
  });
});
