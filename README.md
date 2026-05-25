# Mundial Pool

Juego web mobile-first para vivir el Mundial 2026 entre amigos con una mecanica de pool por partido.

## Stack

- Next.js 16
- React 19
- TypeScript
- Supabase (schema inicial en `supabase/schema.sql`)

## Scripts

- `pnpm dev`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test`
- `pnpm qa`
- `pnpm ops:process:one <match-id>`
- `pnpm ops:process:all`

## Variables de entorno

Copiar `.env.example` a `.env.local` y completar:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Estado actual

Incluye:

- shell mobile-first
- pantallas iniciales del MVP
- ingreso local con `nombre + PIN`
- jugadas persistidas por partido en localStorage
- datos mock para flujo base
- esquema SQL inicial
- seed inicial en `supabase/seed.sql`
- cliente lazy de Supabase
- repositorios server-side con fallback a mocks
- documentacion de producto en `docs/`
- modo demo con perfiles locales para revisar UI y estados sin backend real

## Modo demo

- El producto trae perfiles dummy listos: `Guido`, `Mari`, `Bato`, `Pepo` y `Cami`
- Puedes cambiar de perfil desde `Inicio` o `Perfil`
- Cada perfil cambia:
  - jugadas cargadas
  - ranking personal
  - historial
  - estados de partido y reveal
  - pick de campeon
- El selector guarda una cookie local `mundial_pool_demo_persona` y sincroniza una sesion local de prueba

## Runbooks

- `docs/operations.md`
- `docs/handoff.md`
