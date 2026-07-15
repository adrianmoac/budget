/**
 * Domain type surface. DB types are generated (never hand-edited) in
 * `src/types/database.types.ts`; this module re-exports the rows, insert/update
 * payloads, and enums the app consumes so nothing imports the generated file's
 * verbose helper generics directly.
 */
import type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
} from '@/types/database.types';

// --- Enums ---
export type TxType = Database['public']['Enums']['tx_type']; // 'expense' | 'income'
export type Recurrence = Database['public']['Enums']['recurrence']; // 'recurrent' | 'variable'
export type CategoryKind = Database['public']['Enums']['category_kind']; // 'normal' | 'otros' | 'debt'
export type DebtStatus = Database['public']['Enums']['debt_status'];

// --- Row types ---
export type Totals = Tables<'totals'>;
export type Category = Tables<'categories'>;
export type Transaction = Tables<'transactions'>;
export type Investment = Tables<'investments'>;
export type InvestmentContribution = Tables<'investment_contributions'>;
export type Debt = Tables<'debts'>;
export type RecommendedItem = Tables<'recommended_items'>;

// --- Insert / Update payloads ---
export type TransactionInsert = TablesInsert<'transactions'>;
export type TransactionUpdate = TablesUpdate<'transactions'>;
