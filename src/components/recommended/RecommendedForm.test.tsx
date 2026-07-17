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

  it('defaults to a one-off, with no window end and a plain date field', async () => {
    const user = userEvent.setup();
    render(<RecommendedForm open onOpenChange={vi.fn()} categories={categories} />);

    // A one-off has no range: just a date, and no end-of-window field.
    expect(screen.getByLabelText('Fecha')).toBeInTheDocument();
    expect(screen.queryByLabelText('Fin de ventana (opcional)')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Descripción'), 'Trámite');
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1));
    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ repeat_mode: 'none', window_end: null }),
    );
  });

  it('reveals the window end when switched to a repeating mode', async () => {
    const user = userEvent.setup();
    render(<RecommendedForm open onOpenChange={vi.fn()} categories={categories} />);

    await user.click(screen.getByLabelText('Repetir'));
    await user.click(await screen.findByRole('option', { name: 'Cada mes' }));

    await waitFor(() =>
      expect(screen.getByLabelText('Fin de ventana (opcional)')).toBeInTheDocument(),
    );
    expect(screen.getByLabelText('Inicio de ventana')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Descripción'), 'Renta');
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1));
    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ repeat_mode: 'monthly' }),
    );
  });

  it('converts the expected pesos amount to integer centavos', async () => {
    const user = userEvent.setup();
    render(<RecommendedForm open onOpenChange={vi.fn()} categories={categories} />);

    await user.type(screen.getByLabelText('Descripción'), 'Súper');
    await user.type(screen.getByLabelText('Monto esperado (opcional)'), '150.50');
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1));
    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ expected_amount_cents: 15_050 }),
    );
  });

  it('blocks submit without a description, which is the match key', async () => {
    const user = userEvent.setup();
    render(<RecommendedForm open onOpenChange={vi.fn()} categories={categories} />);

    await user.click(screen.getByRole('button', { name: 'Crear' }));

    expect(
      await screen.findByText(
        'Requerida: se compara con tus movimientos para saber si ya la registraste',
      ),
    ).toBeInTheDocument();
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it('rejects a window end before the window start', async () => {
    const user = userEvent.setup();
    render(<RecommendedForm open onOpenChange={vi.fn()} categories={categories} />);

    // The default is a one-off, which has no window end — switch to a repeating
    // mode so the field exists.
    await user.click(screen.getByLabelText('Repetir'));
    await user.click(await screen.findByRole('option', { name: 'Cada mes' }));
    await screen.findByLabelText('Fin de ventana (opcional)');

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
