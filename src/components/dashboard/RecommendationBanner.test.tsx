import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecommendationBanner } from './RecommendationBanner';
import type { RecommendedItem } from '@/domain/types';

interface MissingResult {
  data: RecommendedItem[] | undefined;
  isSuccess: boolean;
}
const useMissingRecommendations = vi.fn<() => MissingResult>();
const createMutate = vi.fn();

vi.mock('@/hooks/useRecommendations', () => ({
  useMissingRecommendations: () => useMissingRecommendations(),
}));
vi.mock('@/hooks/useCategories', () => ({
  useCategories: () => ({
    data: [
      { id: 'cat-1', name: 'Comida', kind: 'normal' },
      { id: 'cat-otros', name: 'Otros', kind: 'otros' },
    ],
  }),
}));
vi.mock('@/hooks/useTransactions', () => ({
  useCreateTransaction: () => ({ mutate: createMutate, mutateAsync: vi.fn() }),
  useUpdateTransaction: () => ({ mutateAsync: vi.fn() }),
}));
// The no-amount path opens a real EntryForm, which reads the debt hooks.
vi.mock('@/hooks/useDebts', () => ({
  useDebts: () => ({ data: [] }),
  useDebtPayments: () => ({ data: [] }),
  useRecordDebtPayment: () => ({ mutateAsync: vi.fn() }),
}));

function item(over: Partial<RecommendedItem>): RecommendedItem {
  return {
    id: 'r1',
    user_id: 'u',
    type: 'expense',
    category_id: 'cat-1',
    description: 'Súper mensual',
    expected_amount_cents: 20_000,
    window_start: '2026-01-01',
    window_end: null,
    repeat_mode: 'monthly',
    created_at: '',
    ...over,
  };
}

afterEach(() => {
  useMissingRecommendations.mockReset();
  createMutate.mockReset();
});

describe('RecommendationBanner', () => {
  it('renders the missing recommendations when there are any', () => {
    useMissingRecommendations.mockReturnValue({ data: [item({})], isSuccess: true });
    render(<RecommendationBanner />);

    expect(screen.getByText('Movimientos sugeridos este mes')).toBeInTheDocument();
    expect(screen.getByText('Súper mensual')).toBeInTheDocument();
    expect(screen.getByText('$200.00')).toBeInTheDocument();
  });

  it('renders nothing when no recommendation is missing', () => {
    useMissingRecommendations.mockReturnValue({ data: [], isSuccess: true });
    const { container } = render(<RecommendationBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while the query is still loading', () => {
    useMissingRecommendations.mockReturnValue({ data: undefined, isSuccess: false });
    const { container } = render(<RecommendationBanner />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('RecommendationBanner completing an item', () => {
  it('generates the movement from the item, dated today', async () => {
    useMissingRecommendations.mockReturnValue({ data: [item({})], isSuccess: true });
    const user = userEvent.setup();
    render(<RecommendationBanner />);

    await user.click(screen.getByRole('button', { name: /Marcar Súper mensual/ }));

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    // The description is copied verbatim because it IS the match key — that is what
    // makes the item disappear once the row lands (D3).
    expect(createMutate.mock.calls[0]?.[0]).toMatchObject({
      type: 'expense',
      amount_cents: 20_000,
      description: 'Súper mensual',
      category_id: 'cat-1',
      recurrence: 'recurrent',
    });
  });

  it('falls back to Otros for a category-less expense item', async () => {
    useMissingRecommendations.mockReturnValue({
      data: [item({ category_id: null })],
      isSuccess: true,
    });
    const user = userEvent.setup();
    render(<RecommendationBanner />);

    await user.click(screen.getByRole('button', { name: /Marcar Súper mensual/ }));

    // An expense MUST carry a category (D11); the item has none, so Otros stands in.
    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    expect(createMutate.mock.calls[0]?.[0]).toMatchObject({ category_id: 'cat-otros' });
  });

  it('sends a null category for an income item', async () => {
    useMissingRecommendations.mockReturnValue({
      data: [item({ type: 'income', category_id: null, description: 'Quincena' })],
      isSuccess: true,
    });
    const user = userEvent.setup();
    render(<RecommendationBanner />);

    await user.click(screen.getByRole('button', { name: /Marcar Quincena/ }));

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    expect(createMutate.mock.calls[0]?.[0]).toMatchObject({
      type: 'income',
      category_id: null,
    });
  });

  it('marks a one-off movement variable rather than recurrent', async () => {
    useMissingRecommendations.mockReturnValue({
      data: [item({ repeat_mode: 'none' })],
      isSuccess: true,
    });
    const user = userEvent.setup();
    render(<RecommendationBanner />);

    await user.click(screen.getByRole('button', { name: /Marcar Súper mensual/ }));

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    expect(createMutate.mock.calls[0]?.[0]).toMatchObject({ recurrence: 'variable' });
  });

  it('opens the prefilled form instead of inventing an amount when none is expected', async () => {
    useMissingRecommendations.mockReturnValue({
      data: [item({ expected_amount_cents: null })],
      isSuccess: true,
    });
    const user = userEvent.setup();
    render(<RecommendationBanner />);

    await user.click(screen.getByRole('button', { name: /Marcar Súper mensual/ }));

    // Nothing is guessed: no transaction is created, the form opens for the amount.
    expect(createMutate).not.toHaveBeenCalled();
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
