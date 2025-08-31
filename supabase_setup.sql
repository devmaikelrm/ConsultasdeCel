-- =========================================
-- 1) Tabla + índice + columna generada (igual que tu versión)
-- =========================================
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

-- =========================================
-- 2) RLS y policies (LECTURA PÚBLICA)
-- =========================================
alter table public.phones enable row level security;

-- Reemplazamos cualquier policy previa y dejamos:
-- - SELECT: público (anon y authenticated)
-- - INSERT: solo authenticated
do $$ begin
  if exists (
    select 1 from pg_policies where schemaname='public' and tablename='phones' and policyname='read phones'
  ) then
    execute 'drop policy "read phones" on public.phones';
  end if;
  if exists (
    select 1 from pg_policies where schemaname='public' and tablename='phones' and policyname='insert phones'
  ) then
    execute 'drop policy "insert phones" on public.phones';
  end if;
end $$;

create policy "read phones" on public.phones
for select
to anon, authenticated
using (true);

create policy "insert phones" on public.phones
for insert
to authenticated
with check (auth.uid() is not null);

-- =========================================
-- 3) Storage: bucket 'avatars' + policies (SIN ALTER)
-- =========================================
insert into storage.buckets (id, name, public)
select 'avatars', 'avatars', false
where not exists (select 1 from storage.buckets where id = 'avatars');

-- ¡OJO! no tocamos storage.objects con ALTER (evita 42501).
-- Solo creamos policies idempotentes.
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatars select own'
  ) then
    create policy "avatars select own" on storage.objects
      for select to authenticated
      using (bucket_id = 'avatars' and name like (auth.uid()::text || '/%'));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatars insert own'
  ) then
    create policy "avatars insert own" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'avatars' and name like (auth.uid()::text || '/%'));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatars update own'
  ) then
    create policy "avatars update own" on storage.objects
      for update to authenticated
      using (bucket_id = 'avatars' and name like (auth.uid()::text || '/%'))
      with check (bucket_id = 'avatars' and name like (auth.uid()::text || '/%'));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatars delete own'
  ) then
    create policy "avatars delete own" on storage.objects
      for delete to authenticated
      using (bucket_id = 'avatars' and name like (auth.uid()::text || '/%'));
  end if;
end $$;

-- (Opcional) si falla este GRANT, ejecútalo en el SQL Editor y listo
grant usage on schema storage to authenticated;

-- =========================================
-- 4) Vista en español
-- =========================================
create or replace view public.phones_es as
select
  id,
  commercial_name,
  commercial_name as nombre_comercial,
  model as modelo,
  bands as bandas,
  provinces as provincias
from public.phones;

-- =========================================
-- 5) Aclaraciones
-- =========================================
-- - Lectura pública: revisar.html funciona sin login (usa anon key).
-- - Insert requiere login (evita spam).
-- - No insertes en nombre_comercial (es generada).

