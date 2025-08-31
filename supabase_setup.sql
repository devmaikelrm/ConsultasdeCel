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

-- Done

