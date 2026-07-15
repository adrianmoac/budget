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

// --- EntryForm / transaction (§4.9) ---
// The form works in pesos (a positive amount); conversion to integer centavos
// happens on submit via `toCentavos`. `amountPesos` guards NaN/Infinity/range.
export const entryFormSchema = z.object({
  type: txTypeSchema,
  amountPesos: z
    .number({ invalid_type_error: 'Monto requerido' })
    .finite('Monto inválido')
    .positive('El monto debe ser mayor a 0')
    .max(21_474_836.47, 'El monto excede el máximo permitido'),
  tx_date: isoDateSchema,
  description: z.string().max(280, 'Máximo 280 caracteres'),
  category_id: z.string().uuid('Selecciona una categoría'),
  recurrence: recurrenceSchema,
});
export type EntryFormInput = z.infer<typeof entryFormSchema>;
