import { describe, expect, it } from 'vitest';
import { entryFormSchema, isoDateSchema, loginSchema } from './schemas';

const validEntry = {
  type: 'expense' as const,
  amountPesos: 19.99,
  tx_date: '2025-06-15',
  description: 'Café',
  category_id: '11111111-1111-1111-1111-111111111111',
  recurrence: 'variable' as const,
};

describe('entryFormSchema', () => {
  it('accepts a valid entry', () => {
    expect(entryFormSchema.safeParse(validEntry).success).toBe(true);
  });

  it('rejects a zero amount', () => {
    const r = entryFormSchema.safeParse({ ...validEntry, amountPesos: 0 });
    expect(r.success).toBe(false);
  });

  it('rejects a negative amount', () => {
    expect(entryFormSchema.safeParse({ ...validEntry, amountPesos: -5 }).success).toBe(
      false,
    );
  });

  it('rejects NaN amount (empty numeric input)', () => {
    expect(
      entryFormSchema.safeParse({ ...validEntry, amountPesos: Number.NaN }).success,
    ).toBe(false);
  });

  it('rejects a missing category', () => {
    expect(entryFormSchema.safeParse({ ...validEntry, category_id: '' }).success).toBe(
      false,
    );
  });

  it('rejects an invalid type enum', () => {
    expect(entryFormSchema.safeParse({ ...validEntry, type: 'transfer' }).success).toBe(
      false,
    );
  });

  it('rejects a description over 280 characters', () => {
    const r = entryFormSchema.safeParse({ ...validEntry, description: 'x'.repeat(281) });
    expect(r.success).toBe(false);
  });

  it('accepts an empty description', () => {
    expect(entryFormSchema.safeParse({ ...validEntry, description: '' }).success).toBe(
      true,
    );
  });
});

describe('isoDateSchema', () => {
  it('accepts a real calendar date', () => {
    expect(isoDateSchema.safeParse('2024-02-29').success).toBe(true);
  });

  it('rejects a non-existent date', () => {
    expect(isoDateSchema.safeParse('2025-02-29').success).toBe(false);
  });

  it('rejects a malformed string', () => {
    expect(isoDateSchema.safeParse('15/06/2025').success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    expect(
      loginSchema.safeParse({ email: 'a@b.com', password: 'secret' }).success,
    ).toBe(true);
  });

  it('rejects an invalid email', () => {
    expect(
      loginSchema.safeParse({ email: 'not-an-email', password: 'secret' }).success,
    ).toBe(false);
  });

  it('rejects an empty password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
  });
});
