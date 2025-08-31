# Configuración de CI para ConsultasdeCel

## Requisitos
- Node 20 (usa `.nvmrc`)
- `npm ci` para instalar

## Scripts
- `npm run format` — Prettier
- `npm run lint` — ESLint + Stylelint + HTML Validate

## GitHub
- Habilita *Branch protection* en `main`
- PRs requieren 1 review y CI verde

## Agente (opcional)
Allowlist de dominios:
- `api.github.com`
- `raw.githubusercontent.com`
- `cdn.jsdelivr.net`
- `*.supabase.co`

HTTP: `GET` solamente.

## GitHub Pages (opcional)
Descomenta el job `deploy` en `.github/workflows/ci.yml` y habilita Pages en Settings.
