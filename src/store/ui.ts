import { create } from 'zustand';
import { currentMonthYearMX } from '@/domain/date';
import type { Recurrence } from '@/domain/types';

/** Recurrence filter for the month view: 'all' shows both facets. */
export type RecurrenceFilter = Recurrence | 'all';

interface UiState {
  selectedMonth: number; // 1..12
  selectedYear: number;
  recurrenceFilter: RecurrenceFilter;
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;
  setPeriod: (year: number, month: number) => void;
  setRecurrenceFilter: (filter: RecurrenceFilter) => void;
}

const initial = currentMonthYearMX();

export const useUiStore = create<UiState>((set) => ({
  selectedMonth: initial.month,
  selectedYear: initial.year,
  recurrenceFilter: 'all',
  setSelectedMonth: (month) => set({ selectedMonth: month }),
  setSelectedYear: (year) => set({ selectedYear: year }),
  setPeriod: (year, month) => set({ selectedYear: year, selectedMonth: month }),
  setRecurrenceFilter: (recurrenceFilter) => set({ recurrenceFilter }),
}));
