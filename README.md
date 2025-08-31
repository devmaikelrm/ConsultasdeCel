# Consultas de Cel — Supabase (esquema simple)

Esquema sin tester/email/created_at. Solo: commercial_name, model, bands, provinces.

Sitio publicado: https://devmaikelrm.github.io/ConsultasdeCel/

## Configurar Supabase

1) Crea un proyecto en Supabase y copia:
   - SUPABASE_URL
   - anon public key (rol anon)
2) Edita `public/config.js` con esos valores.
3) Ejecuta el SQL de bootstrap: `supabase_setup.sql` (en el editor SQL de Supabase).

## Crear tabla (si no usas el SQL de bootstrap)

```sql
create table if not exists phones (
  id serial primary key,
  commercial_name text not null,
  model           text not null,
  bands           text not null,
  provinces       text
);
```

## RLS (seguridad)

Si no usaste el SQL de bootstrap, activa RLS en `phones` y añade:

```sql
create policy "read phones" on public.phones
for select to authenticated
using (true);

create policy "insert phones" on public.phones
for insert to authenticated
with check (auth.uid() is not null);
```

## Flujo

- `register.html` → crear cuenta
- `login.html` → entrar
- `subir.html` → guardar modelo (requiere login)
- `revisar.html` → ver y buscar modelos (requiere login)

## GitHub Pages

- Se publica con GitHub Actions desde la carpeta `public/`.
- Si prefieres "Deploy from a branch", hay un `index.html` en la raíz que redirige a `public/index.html` y `.nojekyll` para evitar que se sirva el README.

## Resolución de problemas

- OAuth/redirect mismatch: añade en Supabase (Authentication → URL Configuration):
  - Site URL: `https://devmaikelrm.github.io/ConsultasdeCel/`
  - Additional Redirect URLs:
    - `https://devmaikelrm.github.io/ConsultasdeCel/dashboard.html`
    - `https://devmaikelrm.github.io/ConsultasdeCel/change.html`
- Reset de contraseña: el enlace de correo debe abrir `change.html` (arriba incluido).
- Storage (avatars): crea bucket `avatars`. Las policies están en `supabase_setup.sql`.
- RLS: para leer/insertar en `phones` debes estar autenticado (rol `authenticated`).

