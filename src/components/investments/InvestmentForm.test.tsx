import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvestmentForm } from './InvestmentForm';

const createMutateAsync = vi.fn().mockResolvedValue({});
const renameMutateAsync = vi.fn().mockResolvedValue({});

vi.mock('@/hooks/useInvestments', () => ({
  useCreateInvestment: () => ({ mutateAsync: createMutateAsync }),
  useRenameInvestment: () => ({ mutateAsync: renameMutateAsync }),
}));

beforeEach(() => {
  createMutateAsync.mockClear().mockResolvedValue({});
  renameMutateAsync.mockClear().mockResolvedValue({});
});

describe('InvestmentForm validation', () => {
  it('blocks submit and shows an error when the name is empty', async () => {
    const user = userEvent.setup();
    render(<InvestmentForm open onOpenChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Crear' }));

    expect(await screen.findByText('Nombre requerido')).toBeInTheDocument();
    expect(createMutateAsync).not.toHaveBeenCalled();
  });
});

describe('InvestmentForm create', () => {
  it('creates a vehicle with the trimmed name', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<InvestmentForm open onOpenChange={onOpenChange} />);

    await user.type(screen.getByLabelText('Nombre'), 'BBVA');
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledWith('BBVA'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
