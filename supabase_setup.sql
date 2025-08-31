-- Supabase bootstrap SQL for Consultas de Cel
-- Run this in Supabase SQL editor (or via supabase CLI) once.

-- 1) Phones table (simple schema)
create table if not exists public.phones (
  id               bigserial primary key,
  commercial_name  text not null,
  model            text not null,
  bands            text not null,
  provinces        text
);

-- Añadir columna en español (alias) si no existe: nombre_comercial.
-- Usamos columna generada para que siempre refleje commercial_name.
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='phones' and column_name='nombre_comercial'
  ) then
    alter table public.phones
      add column nombre_comercial text generated always as (commercial_name) stored;
  end if;
end $$;

-- Enable RLS and basic policies (authenticated can read/insert)
alter table public.phones enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'phones' and policyname = 'read phones'
  ) then
    create policy "read phones" on public.phones for select to authenticated using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'phones' and policyname = 'insert phones'
  ) then
    create policy "insert phones" on public.phones for insert to authenticated with check (auth.uid() is not null);
  end if;
end $$;

-- 2) Avatars bucket and storage policies
-- Create bucket if it doesn't exist
insert into storage.buckets (id, name, public)
select 'avatars', 'avatars', false
where not exists (select 1 from storage.buckets where id = 'avatars');

-- Policies for storage.objects on avatars bucket
-- Authenticated users can:
--  - upload files only under their own folder:  <uid>/avatar.<ext>
--  - update/delete only their own files
--  - list/select only files inside their own folder
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatars select own'
  ) then
    create policy "avatars select own" on storage.objects
      for select to authenticated
      using (
        bucket_id = 'avatars'
        and (name like auth.uid()::text || '/%')
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatars insert own'
  ) then
    create policy "avatars insert own" on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'avatars'
        and (name like auth.uid()::text || '/%')
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatars update own'
  ) then
    create policy "avatars update own" on storage.objects
      for update to authenticated
      using (
        bucket_id = 'avatars'
        and (name like auth.uid()::text || '/%')
      )
      with check (
        bucket_id = 'avatars'
        and (name like auth.uid()::text || '/%')
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatars delete own'
  ) then
    create policy "avatars delete own" on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'avatars'
        and (name like auth.uid()::text || '/%')
      );
  end if;
end $$;

-- Optional: grant usage to authenticated role on storage schema (usually preconfigured)
grant usage on schema storage to authenticated;

-- 3) (Opcional) Vista en español con alias de columnas
create or replace view public.phones_es as
select
  id,
  commercial_name,
  commercial_name as nombre_comercial,
  model as modelo,
  bands as bandas,
  provinces as provincias
from public.phones;

-- Done

-- =============================================================
-- Aclaraciones y solución de problemas
-- =============================================================
-- 1) URLs de autenticación (Supabase → Authentication → URL Configuration)
--    - Site URL (para GitHub Pages):
--      https://devmaikelrm.github.io/ConsultasdeCel/
--    - Additional Redirect URLs:
--      https://devmaikelrm.github.io/ConsultasdeCel/dashboard.html
--      https://devmaikelrm.github.io/ConsultasdeCel/change.html
--    Si trabajas en local:
--      http://localhost:3000/dashboard.html
--      http://localhost:3000/change.html
--
-- 2) OAuth (Google/GitHub)
--    - Configura el callback del proveedor exactamente a la URL de dashboard.
--    - Errores típicos: invalid_grant / redirect mismatch → revisa la URL.
--
-- 3) Reset de contraseña
--    - El enlace enviado debe apuntar a change.html (arriba en Redirect URLs).
--    - En la app se usa un BASE_URL que soporta subcarpeta en GitHub Pages.
--
-- 4) Storage (avatars)
--    - Ruta esperada: <uid>/avatar.<ext>
--    - 403 al subir/listar: revisa que las 4 policies “avatars ... own” existan.
--    - 404 al leer: verifica que el archivo exista y la ruta sea correcta.
--
-- 5) RLS en phones
--    - 401/permission denied: asegúrate de iniciar sesión (authenticated) y
--      que existan las policies de select/insert. Con anon key sin sesión,
--      no podrás insertar.
--
-- 6) CORS/Origen
--    - Supabase permite por defecto orígenes públicos con supabase-js.
--      Si usas edge functions o reglas más estrictas, agrega el origen
--      de tu sitio (GitHub Pages o localhost).
--
-- 7) Columna nombre_comercial
--    - Es generada a partir de commercial_name. No escribas directamente
--      en ella (fallará). Inserta en commercial_name; nombre_comercial se
--      completa sola.
--
