import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EntryForm } from './EntryForm';
import type { RecommendedItem, Transaction } from '@/domain/types';

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

// The form offers a "from a recommendation" affordance, so it reads the pending list.
const missingRecommendations = vi.fn<() => { data: RecommendedItem[] }>(() => ({
  data: [],
}));
vi.mock('@/hooks/useRecommendations', () => ({
  useMissingRecommendations: () => missingRecommendations(),
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
  missingRecommendations.mockReturnValue({ data: [] });
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

describe('EntryForm income has no category', () => {
  it('hides the category field when the type is income', async () => {
    const user = userEvent.setup();
    render(<EntryForm open onOpenChange={vi.fn()} />);

    // Default type is expense, so the category field starts visible.
    expect(screen.getByLabelText('Categoría')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Tipo'));
    await user.click(await screen.findByRole('option', { name: 'Ingreso' }));

    await waitFor(() =>
      expect(screen.queryByLabelText('Categoría')).not.toBeInTheDocument(),
    );
  });

  it('submits a null category_id for an income', async () => {
    const user = userEvent.setup();
    render(<EntryForm open onOpenChange={vi.fn()} />);

    await user.click(screen.getByLabelText('Tipo'));
    await user.click(await screen.findByRole('option', { name: 'Ingreso' }));
    await user.type(screen.getByLabelText('Monto'), '1500');
    await user.click(screen.getByRole('button', { name: 'Agregar' }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1));
    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'income', amount_cents: 150_000, category_id: null }),
    );
  });

  it('still requires a category for an expense', async () => {
    const user = userEvent.setup();
    render(<EntryForm open onOpenChange={vi.fn()} />);

    await user.type(screen.getByLabelText('Monto'), '1500');
    await user.click(screen.getByRole('button', { name: 'Agregar' }));

    // Asserted via aria-invalid rather than the message text: the Select's
    // placeholder is the same string, so a text query would be ambiguous.
    await waitFor(() =>
      expect(screen.getByLabelText('Categoría')).toHaveAttribute('aria-invalid', 'true'),
    );
    expect(createMutateAsync).not.toHaveBeenCalled();
  });
});

describe('EntryForm from a recommendation', () => {
  const recommendation: RecommendedItem = {
    id: 'rec-1',
    user_id: 'u',
    type: 'expense',
    category_id: CAT_ID,
    description: 'Agua',
    expected_amount_cents: 18_000,
    window_start: '2026-01-01',
    window_end: null,
    repeat_mode: 'monthly',
    created_at: '',
  };

  it('fills description, amount and the item\'s own category from the picked item', async () => {
    missingRecommendations.mockReturnValue({ data: [recommendation] });
    const user = userEvent.setup();
    render(<EntryForm open onOpenChange={vi.fn()} />);

    await user.click(screen.getByLabelText('Categoría'));
    await user.click(await screen.findByRole('option', { name: /Desde una recomendación/ }));

    await user.click(await screen.findByLabelText('Recomendación pendiente'));
    await user.click(await screen.findByRole('option', { name: /Agua/ }));

    await user.click(screen.getByRole('button', { name: 'Agregar' }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1));
    // The category resolves to the recommendation's own — the sentinel is never saved.
    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'expense',
        description: 'Agua',
        amount_cents: 18_000,
        category_id: CAT_ID,
      }),
    );
  });

  it('offers no recommendation option when none are pending', async () => {
    missingRecommendations.mockReturnValue({ data: [] });
    const user = userEvent.setup();
    render(<EntryForm open onOpenChange={vi.fn()} />);

    await user.click(screen.getByLabelText('Categoría'));

    expect(
      screen.queryByRole('option', { name: /Desde una recomendación/ }),
    ).not.toBeInTheDocument();
  });
});

describe('EntryForm prefill', () => {
  it('seeds a new entry from the given values', () => {
    missingRecommendations.mockReturnValue({ data: [] });
    render(
      <EntryForm
        open
        onOpenChange={vi.fn()}
        prefill={{ type: 'expense', description: 'Luz', category_id: CAT_ID }}
      />,
    );

    expect(screen.getByLabelText('Descripción')).toHaveValue('Luz');
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
