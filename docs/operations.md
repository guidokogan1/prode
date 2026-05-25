# Operations Runbook

## 1. Primer arranque con backend real

### Variables de entorno

Completar `.env.local` con:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Levantar la app

```bash
pnpm install
pnpm dev
```

## 2. Cargar base y seed en Supabase

Ejecutar en este orden:

1. `supabase/schema.sql`
2. `supabase/seed.sql`

Objetivo:

- crear tablas
- crear schema privado para credenciales y sesiones
- cargar equipos, fases, partidos y mercados iniciales

## 3. QA minima antes de probar usuarios reales

```bash
pnpm qa
```

Esto corre:

- tests unitarios
- typecheck
- build completo

## 4. Flujo operativo del torneo

### Procesar un partido puntual

```bash
pnpm ops:process:one <match-id>
```

Ejemplo:

```bash
pnpm ops:process:one arg-jpn
```

Hace:

- sync de estado del mercado
- settlement si ya corresponde
- recomputo de ranking si aplica

### Procesar todos los partidos pendientes

```bash
pnpm ops:process:all
```

Hace:

- recorre partidos `scheduled`, `live` y `finished`
- ejecuta la orquestacion del ciclo de vida por cada uno
- devuelve un resumen por match

## 5. Endpoints admin disponibles

- `POST /api/admin/sync-market`
- `POST /api/admin/settle-match`
- `POST /api/admin/recompute-ranking`
- `POST /api/admin/process-match`
- `POST /api/admin/process-all-matches`

## 6. Checklist operativa

- schema cargado
- seed cargado
- `pnpm qa` en verde
- login remoto funcionando
- guardar jugada funcionando
- reveal funcionando
- settlement funcionando
- ranking funcionando

## 7. Riesgos conocidos antes de conectar datos reales

- hoy el fixture real sigue seed/mockeado
- no hay cron automatico todavia
- no hay auth admin para endpoints operativos
- falta fuente real del Mundial para estados/resultados
