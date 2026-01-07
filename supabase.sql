-- Supabase schema and helper RPC for Wishlist app

-- 1) Table: gifts
create table if not exists public.gifts (
  id bigserial primary key,
  title text not null,
  description text,
  reserved_by text,
  reserved_at timestamptz
);

-- 2) RPC: reserve_gift (atomická rezervace)
-- Volá se jako: select * from reserve_gift(gift_id := 1, user_name := 'Jméno');
create or replace function public.reserve_gift(gift_id bigint, user_name text)
returns table(id bigint, title text, description text, reserved_by text, reserved_at timestamptz) as $$
begin
  update public.gifts g
  set reserved_by = user_name, reserved_at = now()
  where g.id = gift_id and g.reserved_by is null
  returning g.id, g.title, g.description, g.reserved_by, g.reserved_at into id, title, description, reserved_by, reserved_at;

  if found then
    return query select g.id, g.title, g.description, g.reserved_by, g.reserved_at from public.gifts g where g.id = gift_id;
  else
    return; -- vrací nic pokud už rezervováno
  end if;
end;
$$ language plpgsql security definer;

-- NOTE: If you enable Row Level Security (RLS) you can:
--  - enable RLS on the table and add a policy allowing SELECT for anon
--  - keep the function as security definer so RPC can update rows
-- Example (optional):
-- alter table public.gifts enable row level security;
-- create policy "public select" on public.gifts for select using (true);
