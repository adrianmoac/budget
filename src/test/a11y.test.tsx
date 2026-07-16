import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { AxeCore } from 'vitest-axe';
import type { YearMonthSummary } from '@/api/yearSummary';
import { RecommendedForm } from '@/components/recommended/RecommendedForm';
import { YearSummaryTable } from '@/components/year/YearSummaryTable';
import type { Category } from '@/domain/types';

// color-contrast requires a real layout engine (computed colors); jsdom cannot
// run it, so it is disabled here and verified in the E2E layer instead.
const axeOptions: AxeCore.RunOptions = {
  rules: { 'color-contrast': { enabled: false } },
};

// Automated WCAG 2.1 AA audit (CP-7.2 / architecture §3 Accessibility). axe-core
// runs against representative accessible surfaces — a data table and a form dialog.
// Note: in jsdom, layout-dependent rules (e.g. color-contrast) report as
// "incomplete" rather than "violations"; the matcher only fails on violations,
// so contrast is verified in the Playwright/E2E layer against a real renderer.

vi.mock('@/hooks/useRecommendations', () => ({
  useCreateRecommendedItem: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
  useUpdateRecommendedItem: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
}));

function twelveMonthRows(): YearMonthSummary[] {
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    income_cents: 0,
    expense_cents: 0,
    balance_cents: 0,
    invested_cents: 0,
  }));
}

const categories: Category[] = [
  { id: 'cat-1', user_id: 'u', name: 'Comida', kind: 'normal', created_at: '' },
];

describe('accessibility (WCAG 2.1 AA)', () => {
  it('year summary table has no axe violations', async () => {
    const { container } = render(<YearSummaryTable rows={twelveMonthRows()} />);
    expect(await axe(container, axeOptions)).toHaveNoViolations();
  });

  it('recommended-item form dialog has no axe violations', async () => {
    // Radix portals dialog content to document.body, so audit the whole tree.
    const { baseElement } = render(
      <RecommendedForm open onOpenChange={vi.fn()} categories={categories} />,
    );
    expect(await axe(baseElement, axeOptions)).toHaveNoViolations();
  });
});
