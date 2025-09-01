
-- =========================
-- phones + RLS + storage (usuario)
-- =========================

-- 1) Tabla + índice + columna generada
create table if not exists public.phones (
  id               bigserial primary key,
  commercial_name  text not null,
  model            text not null,
  bands            text not null,
  provinces        text
);

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='phones' and column_name='nombre_comercial'
  ) then
    alter table public.phones
      add column nombre_comercial text generated always as (commercial_name) stored;
  end if;
end $$;

create index if not exists idx_phones_commercial_name on public.phones (lower(commercial_name));
create index if not exists idx_phones_model           on public.phones (lower(model));
create index if not exists idx_phones_bands           on public.phones (lower(bands));

-- 2) RLS y policies (LECTURA PÚBLICA)
alter table public.phones enable row level security;

do $$ begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='phones' and policyname='read phones') then
    execute 'drop policy "read phones" on public.phones';
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='phones' and policyname='insert phones') then
    execute 'drop policy "insert phones" on public.phones';
  end if;
end $$;

create policy "read phones" on public.phones
for select to anon, authenticated using (true);

create policy "insert phones" on public.phones
for insert to authenticated with check (auth.uid() is not null);

-- 3) Storage: bucket 'avatars' (privado) + policies
insert into storage.buckets (id, name, public)
select 'avatars', 'avatars', false
where not exists (select 1 from storage.buckets where id = 'avatars');

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatars select own') then
    create policy "avatars select own" on storage.objects
      for select to authenticated
      using (bucket_id = 'avatars' and name like (auth.uid()::text || '/%'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatars insert own') then
    create policy "avatars insert own" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'avatars' and name like (auth.uid()::text || '/%'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatars update own') then
    create policy "avatars update own" on storage.objects
      for update to authenticated
      using (bucket_id = 'avatars' and name like (auth.uid()::text || '/%'))
      with check (bucket_id = 'avatars' and name like (auth.uid()::text || '/%'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatars delete own') then
    create policy "avatars delete own" on storage.objects
      for delete to authenticated
      using (bucket_id = 'avatars' and name like (auth.uid()::text || '/%'));
  end if;
end $$;

grant usage on schema storage to authenticated;

-- 4) Vista en español
create or replace view public.phones_es as
select
  id,
  commercial_name,
  commercial_name as nombre_comercial,
  model as modelo,
  bands as bandas,
  provinces as provincias
from public.phones;

-- =========================
-- Extra: tabla de perfiles (si no existe)
-- =========================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  province text,
  avatar_url text,   -- guardamos la RUTA (no URL pública) cuando el bucket es privado
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles read own') then
    create policy "profiles read own" on public.profiles for select to authenticated using (id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles upsert own') then
    create policy "profiles upsert own" on public.profiles for insert to authenticated with check (id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles update own') then
    create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
  end if;
end $$;


-- Campo de estado para revisiones (pendiente/revisado)
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='phones' and column_name='estado'
  ) then
    alter table public.phones
      add column estado text not null default 'pendiente'
      check (estado in ('pendiente','revisado'));
  end if;
end $$;

create index if not exists idx_phones_estado on public.phones (estado);
