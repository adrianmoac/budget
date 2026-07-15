-- 0020_handle_new_user
-- Provisions a newly created auth user: seeds the zeroed totals row FIRST (so the
-- maintenance triggers always find it), then the 11 seed categories + the system
-- debt category, then the two seed investment vehicles. SECURITY DEFINER because it
-- runs in the auth signup context where auth.uid() is not yet set; user_id is passed
-- explicitly as new.id.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into totals (user_id) values (new.id);

  insert into categories (user_id, name, kind) values
    (new.id, 'Casa',           'normal'),
    (new.id, 'Coche',          'normal'),
    (new.id, 'Suscripciones',  'normal'),
    (new.id, 'Comida',         'normal'),
    (new.id, 'Salidas',        'normal'),
    (new.id, 'Viajes',         'normal'),
    (new.id, 'Entretenimiento','normal'),
    (new.id, 'Súper',          'normal'),
    (new.id, 'Ropa',           'normal'),
    (new.id, 'Personal',       'normal'),
    (new.id, 'Otros',          'otros'),
    (new.id, 'Deuda',          'debt');

  insert into investments (user_id, name) values
    (new.id, 'GBM'),
    (new.id, 'Cetes');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
