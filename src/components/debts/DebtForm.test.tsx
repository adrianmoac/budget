import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DebtForm } from './DebtForm';

const createMutateAsync = vi.fn().mockResolvedValue({});
const updateMutateAsync = vi.fn().mockResolvedValue({});

vi.mock('@/hooks/useDebts', () => ({
  useCreateDebt: () => ({ mutateAsync: createMutateAsync }),
  useUpdateDebt: () => ({ mutateAsync: updateMutateAsync }),
}));

beforeEach(() => {
  createMutateAsync.mockClear().mockResolvedValue({});
  updateMutateAsync.mockClear().mockResolvedValue({});
});

describe('DebtForm validation', () => {
  it('blocks submit and shows an error when required fields are empty', async () => {
    const user = userEvent.setup();
    render(<DebtForm open onOpenChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Crear' }));

    expect(await screen.findByText('Nombre requerido')).toBeInTheDocument();
    expect(createMutateAsync).not.toHaveBeenCalled();
  });
});

describe('DebtForm create', () => {
  it('converts the minimum to centavos and seeds remaining_months with the total', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<DebtForm open onOpenChange={onOpenChange} />);

    await user.type(screen.getByLabelText('Nombre'), 'Tarjeta');
    await user.type(screen.getByLabelText('Meses totales'), '6');
    await user.type(screen.getByLabelText('Pago mínimo'), '500');
    await user.type(screen.getByLabelText('Día de vencimiento'), '15');
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    await waitFor(() =>
      expect(createMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Tarjeta',
          total_months: 6,
          remaining_months: 6,
          minimum_payment_cents: 50000,
          due_day: 15,
        }),
      ),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not expose the remaining-months override when creating', () => {
    render(<DebtForm open onOpenChange={vi.fn()} />);
    expect(screen.queryByLabelText('Meses restantes')).not.toBeInTheDocument();
  });
});
