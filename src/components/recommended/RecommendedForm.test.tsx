import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecommendedForm } from './RecommendedForm';
import type { Category } from '@/domain/types';

const createMutateAsync = vi.fn().mockResolvedValue({});
const updateMutateAsync = vi.fn().mockResolvedValue({});

vi.mock('@/hooks/useRecommendations', () => ({
  useCreateRecommendedItem: () => ({ mutateAsync: createMutateAsync }),
  useUpdateRecommendedItem: () => ({ mutateAsync: updateMutateAsync }),
}));

const categories: Category[] = [
  { id: 'cat-1', user_id: 'u', name: 'Comida', kind: 'normal', created_at: '' },
];

beforeEach(() => {
  createMutateAsync.mockClear().mockResolvedValue({});
  updateMutateAsync.mockClear().mockResolvedValue({});
});

describe('RecommendedForm create', () => {
  it('submits null category and null expected amount when left blank', async () => {
    const user = userEvent.setup();
    render(<RecommendedForm open onOpenChange={vi.fn()} categories={categories} />);

    // Defaults: type=expense, no category, no expected amount, window_start=today.
    await user.type(screen.getByLabelText('Descripción'), 'Renta');
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1));
    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'expense',
        category_id: null,
        description: 'Renta',
        expected_amount_cents: null,
        window_end: null,
      }),
    );
  });

  it('converts the expected pesos amount to integer centavos', async () => {
    const user = userEvent.setup();
    render(<RecommendedForm open onOpenChange={vi.fn()} categories={categories} />);

    await user.type(screen.getByLabelText('Monto esperado (opcional)'), '150.50');
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1));
    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ expected_amount_cents: 15_050 }),
    );
  });

  it('rejects a window end before the window start', async () => {
    const user = userEvent.setup();
    render(<RecommendedForm open onOpenChange={vi.fn()} categories={categories} />);

    // Date inputs are set via change events (jsdom date typing is unreliable).
    fireEvent.change(screen.getByLabelText('Inicio de ventana'), {
      target: { value: '2026-05-01' },
    });
    fireEvent.change(screen.getByLabelText('Fin de ventana (opcional)'), {
      target: { value: '2026-04-01' },
    });
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    expect(
      await screen.findByText('Debe ser igual o posterior al inicio'),
    ).toBeInTheDocument();
    expect(createMutateAsync).not.toHaveBeenCalled();
  });
});
