import { PostgrestError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { AppError } from './errors';

function pgError(code: string, message: string): PostgrestError {
  return new PostgrestError({ message, details: '', hint: '', code });
}

describe('AppError.fromPostgrest', () => {
  it('maps a unique violation to name_conflict', () => {
    const err = AppError.fromPostgrest(pgError('23505', 'duplicate key value'));
    expect(err.code).toBe('name_conflict');
  });

  it('maps an RPC protected-category exception to its typed code', () => {
    const err = AppError.fromPostgrest(pgError('P0001', 'cannot_delete_protected_category'));
    expect(err.code).toBe('cannot_delete_protected_category');
  });

  it('maps an RPC not-found exception to category_not_found', () => {
    const err = AppError.fromPostgrest(pgError('P0001', 'category_not_found'));
    expect(err.code).toBe('category_not_found');
  });

  it('maps an unknown RPC exception message to unexpected_error', () => {
    const err = AppError.fromPostgrest(pgError('P0001', 'something_else'));
    expect(err.code).toBe('unexpected_error');
  });

  it('maps the record_debt_payment debt_not_found exception to its typed code', () => {
    const err = AppError.fromPostgrest(pgError('P0001', 'debt_not_found'));
    expect(err.code).toBe('debt_not_found');
  });

  it('maps the record_debt_payment debt_not_active exception to its typed code', () => {
    const err = AppError.fromPostgrest(pgError('P0001', 'debt_not_active'));
    expect(err.code).toBe('debt_not_active');
  });

  it('maps the record_debt_payment invalid_amount exception to its typed code', () => {
    const err = AppError.fromPostgrest(pgError('P0001', 'invalid_amount'));
    expect(err.code).toBe('invalid_amount');
  });
});
