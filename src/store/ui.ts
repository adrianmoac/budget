import { create } from 'zustand';
import { currentMonthYearMX } from '@/domain/date';
import type { Recurrence } from '@/domain/types';

/** Recurrence filter for the month view: 'all' shows both facets. */
export type RecurrenceFilter = Recurrence | 'all';

/**
 * Category filter for the month view: a category id, or `ALL_CATEGORIES`. Expenses
 * only — income carries no category (D11), so picking one hides that table.
 * (A plain `string`: `string | 'all'` would collapse to `string` anyway.)
 */
export const ALL_CATEGORIES = 'all';
export type CategoryFilter = string;

interface UiState {
  selectedMonth: number; // 1..12
  selectedYear: number;
  recurrenceFilter: RecurrenceFilter;
  categoryFilter: CategoryFilter;
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;
  setPeriod: (year: number, month: number) => void;
  setRecurrenceFilter: (filter: RecurrenceFilter) => void;
  setCategoryFilter: (filter: CategoryFilter) => void;
}

const initial = currentMonthYearMX();

export const useUiStore = create<UiState>((set) => ({
  selectedMonth: initial.month,
  selectedYear: initial.year,
  recurrenceFilter: 'all',
  categoryFilter: ALL_CATEGORIES,
  setSelectedMonth: (month) => set({ selectedMonth: month }),
  setSelectedYear: (year) => set({ selectedYear: year }),
  setPeriod: (year, month) => set({ selectedYear: year, selectedMonth: month }),
  setRecurrenceFilter: (recurrenceFilter) => set({ recurrenceFilter }),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
}));
