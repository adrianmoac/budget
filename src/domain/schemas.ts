import { z } from 'zod';

/**
 * Zod schemas are the single boundary validator (architecture §6). Every form /
 * write payload is validated here before an api call; DB CHECK constraints are
 * the backstop. Enum allowlists mirror the DB enums exactly.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const txTypeSchema = z.enum(['expense', 'income']);
export const recurrenceSchema = z.enum(['recurrent', 'variable']);

/** ISO `YYYY-MM-DD`, additionally required to be a real calendar date. */
export const isoDateSchema = z
  .string()
  .regex(ISO_DATE, 'Fecha inválida')
  .refine((v) => {
    const [y, m, d] = v.split('-').map(Number);
    if (!y || !m || !d) return false;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return (
      dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
    );
  }, 'Fecha inválida');

// --- Login (§4.1) ---
export const loginSchema = z.object({
  email: z.string().min(1, 'Correo requerido').email('Correo inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});
export type LoginInput = z.infer<typeof loginSchema>;

// --- Category (§4.5) ---
// Name 1–64 chars (mirrors the DB CHECK); trimmed so trailing whitespace does
// not smuggle in a "different" name past the UNIQUE(user_id, name) constraint.
export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, 'Nombre requerido').max(64, 'Máximo 64 caracteres'),
});
export type CategoryFormInput = z.infer<typeof categoryFormSchema>;

// Shared money field: forms work in pesos (a positive amount); conversion to
// integer centavos happens on submit via `toCentavos`. Guards NaN/Infinity/range
// so the entry, debt-minimum, and payment amounts validate identically (§10.3).
const pesosAmountSchema = z
  .number({ invalid_type_error: 'Monto requerido' })
  .finite('Monto inválido')
  .positive('El monto debe ser mayor a 0')
  .max(21_474_836.47, 'El monto excede el máximo permitido');

// --- EntryForm / transaction (§4.9) ---
export const entryFormSchema = z.object({
  type: txTypeSchema,
  amountPesos: pesosAmountSchema,
  tx_date: isoDateSchema,
  description: z.string().max(280, 'Máximo 280 caracteres'),
  category_id: z.string().uuid('Selecciona una categoría'),
  recurrence: recurrenceSchema,
});
export type EntryFormInput = z.infer<typeof entryFormSchema>;

// --- Debt (§4.6, §3.5) ---
// Minimum payment is entered in pesos; total/remaining months are bounded
// integers (remaining ≤ total mirrors the DB CHECK). total_months is capped to a
// sane 600 (50 years) so an unbounded integer never reaches the boundary.
export const debtFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Nombre requerido').max(120, 'Máximo 120 caracteres'),
    total_months: z
      .number({ invalid_type_error: 'Requerido' })
      .int('Debe ser un número entero')
      .positive('Debe ser mayor a 0')
      .max(600, 'Máximo 600 meses'),
    remaining_months: z
      .number({ invalid_type_error: 'Requerido' })
      .int('Debe ser un número entero')
      .nonnegative('No puede ser negativo'),
    minimumPesos: pesosAmountSchema,
    due_day: z
      .number({ invalid_type_error: 'Requerido' })
      .int('Debe ser un número entero')
      .min(1, 'Entre 1 y 31')
      .max(31, 'Entre 1 y 31'),
    start_date: isoDateSchema,
  })
  .refine((d) => d.remaining_months <= d.total_months, {
    message: 'No puede exceder el total de meses',
    path: ['remaining_months'],
  });
export type DebtFormInput = z.infer<typeof debtFormSchema>;

// --- Debt payment (§4.6, §4.9, §3.2) ---
export const paymentFormSchema = z.object({
  amountPesos: pesosAmountSchema,
  date: isoDateSchema,
  description: z.string().max(280, 'Máximo 280 caracteres'),
});
export type PaymentFormInput = z.infer<typeof paymentFormSchema>;

// --- Investment vehicle (§4.7) ---
// Name 1–80 chars (mirrors the DB CHECK); trimmed so trailing whitespace does not
// smuggle in a "different" name past the UNIQUE(user_id, name) constraint.
export const investmentFormSchema = z.object({
  name: z.string().trim().min(1, 'Nombre requerido').max(80, 'Máximo 80 caracteres'),
});
export type InvestmentFormInput = z.infer<typeof investmentFormSchema>;

// --- Investment contribution (§4.7, §3.1) ---
// Amount entered in pesos (converted to centavos on submit, shared guard); the
// vehicle is chosen from the user's investments.
export const contributionFormSchema = z.object({
  investment_id: z.string().uuid('Selecciona una inversión'),
  amountPesos: pesosAmountSchema,
  contrib_date: isoDateSchema,
});
export type ContributionFormInput = z.infer<typeof contributionFormSchema>;
