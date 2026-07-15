import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EntryForm } from './EntryForm';
import type { Transaction } from '@/domain/types';

const CAT_ID = '11111111-1111-1111-1111-111111111111';

const createMutateAsync = vi.fn().mockResolvedValue({});
const updateMutateAsync = vi.fn().mockResolvedValue({});

vi.mock('@/hooks/useTransactions', () => ({
  useCreateTransaction: () => ({ mutateAsync: createMutateAsync }),
  useUpdateTransaction: () => ({ mutateAsync: updateMutateAsync }),
}));

vi.mock('@/hooks/useCategories', () => ({
  useCategories: () => ({
    data: [
      { id: CAT_ID, name: 'Comida', kind: 'normal', user_id: 'u', created_at: '' },
    ],
    isPending: false,
  }),
}));

vi.mock('@/hooks/useDebts', () => ({
  useDebts: () => ({ data: [] }),
  useDebtPayments: () => ({ data: [] }),
  useRecordDebtPayment: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
}));

const existingTransaction: Transaction = {
  id: 'tx-1',
  user_id: 'u',
  type: 'expense',
  amount_cents: 5000,
  tx_date: '2025-06-10',
  description: 'Comida',
  category_id: CAT_ID,
  recurrence: 'variable',
  debt_id: null,
  created_at: '2025-06-10T00:00:00Z',
  updated_at: '2025-06-10T00:00:00Z',
};

beforeEach(() => {
  createMutateAsync.mockClear();
  updateMutateAsync.mockClear();
});

describe('EntryForm validation', () => {
  it('blocks submit and shows errors when required fields are empty', async () => {
    const user = userEvent.setup();
    render(<EntryForm open onOpenChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Agregar' }));

    // Empty amount is rejected (NaN → required) and submission is blocked.
    expect(await screen.findByText('Monto requerido')).toBeInTheDocument();
    expect(createMutateAsync).not.toHaveBeenCalled();
  });
});

describe('EntryForm money conversion (edit)', () => {
  it('converts a pesos amount to integer centavos without float drift', async () => {
    const user = userEvent.setup();
    render(<EntryForm open onOpenChange={vi.fn()} transaction={existingTransaction} />);

    const amount = screen.getByLabelText('Monto');
    await user.clear(amount);
    await user.type(amount, '19.99');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1));
    expect(updateMutateAsync).toHaveBeenCalledWith({
      id: 'tx-1',
      input: expect.objectContaining({
        type: 'expense',
        amount_cents: 1999,
        category_id: CAT_ID,
        tx_date: '2025-06-10',
        recurrence: 'variable',
      }),
    });
  });
});
