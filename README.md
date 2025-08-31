# Consultas de Cel — Supabase (esquema simple)
Esquema sin tester/email/created_at. Solo: commercial_name, model, bands, provinces.

## Configurar Supabase
1) Crea un proyecto en Supabase y copia:
   - SUPABASE_URL
   - anon public key
2) Edita `config.js` con esos valores.

## Crear tabla
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
Activa RLS en `phones` y añade:

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
- `revisar.html` → ver y buscar modelos
