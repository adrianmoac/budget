import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoryForm } from './CategoryForm';

const createMutateAsync = vi.fn().mockResolvedValue({});
const renameMutateAsync = vi.fn().mockResolvedValue({});

vi.mock('@/hooks/useCategories', () => ({
  useCreateCategory: () => ({ mutateAsync: createMutateAsync }),
  useRenameCategory: () => ({ mutateAsync: renameMutateAsync }),
}));

beforeEach(() => {
  createMutateAsync.mockClear().mockResolvedValue({});
  renameMutateAsync.mockClear().mockResolvedValue({});
});

describe('CategoryForm validation', () => {
  it('blocks submit and shows an error when the name is empty', async () => {
    const user = userEvent.setup();
    render(<CategoryForm open onOpenChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Crear' }));

    expect(await screen.findByText('Nombre requerido')).toBeInTheDocument();
    expect(createMutateAsync).not.toHaveBeenCalled();
  });
});

describe('CategoryForm create', () => {
  it('trims the name and calls create on submit', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<CategoryForm open onOpenChange={onOpenChange} />);

    await user.type(screen.getByLabelText('Nombre'), '  Mascotas  ');
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledWith('Mascotas'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows a name-collision error on the field and keeps the dialog open', async () => {
    // Duck-typed PostgREST unique-violation shape (AppError.fromUnknown narrows
    // on code/message/details); avoids importing the banned supabase-js type here.
    const conflict = { code: '23505', message: 'duplicate key value', details: '' };
    createMutateAsync.mockRejectedValueOnce(conflict);
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<CategoryForm open onOpenChange={onOpenChange} />);

    await user.type(screen.getByLabelText('Nombre'), 'Comida');
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    expect(await screen.findByText('Ese nombre ya existe')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
