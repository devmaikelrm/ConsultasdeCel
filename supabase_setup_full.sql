
-- Supabase full setup for Consultas de Cel
-- Run in SQL editor (Auth schema pre-exists).

-- Extensions (if needed)
create extension if not exists pgcrypto;

-- =======================
-- PROFILES
-- =======================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  province text,
  avatar_url text,
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy if not exists "profiles - read own"
on public.profiles for select
to authenticated
using ( id = auth.uid() );

create policy if not exists "profiles - insert own"
on public.profiles for insert
to authenticated
with check ( id = auth.uid() );

create policy if not exists "profiles - update own"
on public.profiles for update
to authenticated
using ( id = auth.uid() )
with check ( id = auth.uid() );

-- =======================
-- PHONES (modelos)
-- =======================
create table if not exists public.phones (
  id uuid primary key default gen_random_uuid(),
  commercial_name text not null,
  model text not null,
  bands text,                 -- "2G,3G,4G" o texto libre
  provinces text[],           -- array de provincias
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.phones enable row level security;

-- Lectura pública (opcional). Si prefieres solo autenticados, cambia 'public' por 'authenticated'
create policy if not exists "phones - read public"
on public.phones for select
to public
using ( true );

create policy if not exists "phones - insert auth"
on public.phones for insert
to authenticated
with check ( created_by = auth.uid() or created_by is null );

create policy if not exists "phones - update owner"
on public.phones for update
to authenticated
using ( created_by = auth.uid() )
with check ( created_by = auth.uid() );

-- Trigger para updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

drop trigger if exists trg_phones_updated_at on public.phones;
create trigger trg_phones_updated_at
before update on public.phones
for each row execute function public.set_updated_at();

-- Índices útiles
create index if not exists idx_phones_model on public.phones (lower(model));
create index if not exists idx_phones_commercial_name on public.phones (lower(commercial_name));
create index if not exists idx_phones_provinces on public.phones using gin (provinces);

-- =======================
-- CATÁLOGO DE PROVINCIAS (opcional)
-- =======================
create table if not exists public.cat_provincias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true,
  orden int not null default 100
);
alter table public.cat_provincias enable row level security;

create policy if not exists "cat_provincias - read actives"
on public.cat_provincias for select
to public
using ( activo = true );

insert into public.cat_provincias (nombre, orden) values
('Pinar del Río', 10), ('Artemisa', 20), ('La Habana', 30), ('Mayabeque', 40),
('Matanzas', 50), ('Cienfuegos', 60), ('Villa Clara', 70), ('Sancti Spíritus', 80),
('Ciego de Ávila', 90), ('Camagüey', 100), ('Las Tunas', 110), ('Holguín', 120),
('Granma', 130), ('Santiago de Cuba', 140), ('Guantánamo', 150), ('Isla de la Juventud', 160)
on conflict (nombre) do nothing;

-- =======================
-- STORAGE (avatars) - RLS
-- Nota: el bucket 'avatars' se crea desde la UI de Storage.
-- =======================
-- Lectura pública (si usas bucket público)
create policy if not exists "avatars - public read"
on storage.objects for select
to public
using ( bucket_id = 'avatars' );

-- Subidas solo a carpeta del usuario autenticado: 'uid/...'
create policy if not exists "avatars - user can upload own"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'avatars' and auth.uid()::text = split_part(name,'/',1) );

-- Borrado solo propio
create policy if not exists "avatars - user can delete own"
on storage.objects for delete
to authenticated
using ( bucket_id = 'avatars' and auth.uid()::text = split_part(name,'/',1) );
