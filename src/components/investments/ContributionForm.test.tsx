import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContributionForm } from './ContributionForm';
import type { Investment } from '@/domain/types';

const INV_ID = '22222222-2222-2222-2222-222222222222';

const createMutateAsync = vi.fn().mockResolvedValue({});

vi.mock('@/hooks/useContributions', () => ({
  useCreateContribution: () => ({ mutateAsync: createMutateAsync }),
}));

const investments: Investment[] = [
  {
    id: INV_ID,
    user_id: 'u',
    name: 'GBM',
    contributed_total_cents: 0,
    market_value_cents: 0,
    created_at: '',
  },
];

beforeEach(() => {
  createMutateAsync.mockClear().mockResolvedValue({});
});

describe('ContributionForm validation', () => {
  it('blocks submit when no amount is entered', async () => {
    const user = userEvent.setup();
    render(
      <ContributionForm
        open
        onOpenChange={vi.fn()}
        investments={investments}
        defaultInvestmentId={INV_ID}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(await screen.findByText('Monto requerido')).toBeInTheDocument();
    expect(createMutateAsync).not.toHaveBeenCalled();
  });
});

describe('ContributionForm create', () => {
  it('records a contribution converting pesos to integer centavos', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <ContributionForm
        open
        onOpenChange={onOpenChange}
        investments={investments}
        defaultInvestmentId={INV_ID}
      />,
    );

    await user.type(screen.getByLabelText('Monto'), '1500.50');
    await user.click(screen.getByRole('button', { name: 'Registrar' }));

    await waitFor(() =>
      expect(createMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ investment_id: INV_ID, amount_cents: 150050 }),
      ),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
