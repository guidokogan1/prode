# Handoff Rapido

## Estado actual

El proyecto ya tiene:

- frontend mobile-first
- login local + remoto por cookie
- guardado de jugadas
- reveal del grupo
- settlement
- ranking por snapshots
- procesamiento de partidos individual y por lote
- tests del nucleo

## Comandos clave

```bash
pnpm dev
pnpm qa
pnpm ops:process:one arg-jpn
pnpm ops:process:all
```

## Cuando haya credenciales

1. completar `.env.local`
2. cargar `supabase/schema.sql`
3. cargar `supabase/seed.sql`
4. correr `pnpm qa`
5. probar login, jugadas, process-match y ranking

## Lo siguiente despues de enchufar Supabase

- migrar lecturas restantes a datos 100% reales
- conectar fuente real de partidos/resultados
- proteger endpoints admin
- sumar cron/automatizacion
- hacer QA manual de UI y flujo completo
