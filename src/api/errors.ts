import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Stable machine error code. DB/RPC errors and PostgREST failures are mapped to
 * one of these; the UI renders `userMessage`, never raw Postgres text (§3.7).
 */
export type AppErrorCode =
  | 'invalid_credentials'
  | 'name_conflict'
  | 'fk_restrict_use_rpc'
  | 'check_violation'
  | 'not_authenticated'
  | 'category_not_found'
  | 'cannot_delete_protected_category'
  | 'network_error'
  | 'unexpected_error';

const USER_MESSAGES: Record<AppErrorCode, string> = {
  invalid_credentials: 'Correo o contraseña incorrectos',
  name_conflict: 'Ese nombre ya existe',
  fk_restrict_use_rpc: 'No se puede eliminar directamente; usa la acción correspondiente',
  check_violation: 'Datos inválidos',
  not_authenticated: 'Tu sesión expiró. Inicia sesión de nuevo',
  category_not_found: 'La categoría ya no existe',
  cannot_delete_protected_category: 'Esta categoría no se puede eliminar',
  network_error: 'Sin conexión — se requiere internet',
  unexpected_error: 'Ocurrió un error inesperado',
};

/**
 * RPCs raise Postgres exceptions (SQLSTATE `P0001`) whose message is a stable
 * machine code (spec §3.7). Map the known ones; anything else is unexpected.
 */
const RPC_ERROR_CODES: readonly AppErrorCode[] = [
  'category_not_found',
  'cannot_delete_protected_category',
];

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly userMessage: string;

  constructor(code: AppErrorCode, userMessage?: string) {
    super(userMessage ?? USER_MESSAGES[code]);
    this.name = 'AppError';
    this.code = code;
    this.userMessage = userMessage ?? USER_MESSAGES[code];
  }

  /** Map a PostgREST error (Postgres SQLSTATE) to a typed AppError (§3.1). */
  static fromPostgrest(error: PostgrestError): AppError {
    switch (error.code) {
      case '23505': // unique_violation
        return new AppError('name_conflict');
      case '23503': // foreign_key_violation (RESTRICT)
        return new AppError('fk_restrict_use_rpc');
      case '23514': // check_violation
      case '22P02': // invalid_text_representation (bad enum)
        return new AppError('check_violation');
      case '42501': // insufficient_privilege / RLS
        return new AppError('not_authenticated');
      case 'P0001': // raise_exception from an RPC — message carries a machine code
        return AppError.fromRpcMessage(error.message);
      default:
        return new AppError('unexpected_error', USER_MESSAGES.unexpected_error);
    }
  }

  /** Resolve an RPC's `P0001` message to its typed code (spec §3.7). */
  static fromRpcMessage(message: string): AppError {
    const code = RPC_ERROR_CODES.find((c) => message.includes(c));
    return new AppError(code ?? 'unexpected_error');
  }

  static fromUnknown(error: unknown): AppError {
    if (error instanceof AppError) return error;
    if (isPostgrestError(error)) return AppError.fromPostgrest(error);
    if (isNetworkError(error)) return new AppError('network_error');
    return new AppError('unexpected_error');
  }
}

function isPostgrestError(e: unknown): e is PostgrestError {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    'message' in e &&
    'details' in e
  );
}

function isNetworkError(e: unknown): boolean {
  return (
    e instanceof TypeError &&
    /fetch|network/i.test(e.message)
  );
}
