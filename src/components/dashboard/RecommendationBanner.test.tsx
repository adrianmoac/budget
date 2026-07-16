import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecommendationBanner } from './RecommendationBanner';
import type { RecommendedItem } from '@/domain/types';

interface MissingResult {
  data: RecommendedItem[] | undefined;
  isSuccess: boolean;
}
const useMissingRecommendations = vi.fn<() => MissingResult>();

vi.mock('@/hooks/useRecommendations', () => ({
  useMissingRecommendations: () => useMissingRecommendations(),
}));
vi.mock('@/hooks/useCategories', () => ({
  useCategories: () => ({ data: [{ id: 'cat-1', name: 'Comida' }] }),
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

afterEach(() => useMissingRecommendations.mockReset());

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
