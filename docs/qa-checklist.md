# QA Checklist MVP

## Reglas del juego

- La jugada siempre suma `10.000`.
- Ningun outcome supera `7.000`.
- No se aceptan montos negativos.
- El settlement reparte el pozo total de forma proporcional.
- Si nadie apuesta al outcome ganador, el settlement falla de forma explicita.
- El ranking desempata por:
  - ganancia acumulada
  - cantidad de jugadas positivas
  - mejor acierto individual

## Sesion

- Con backend real: login crea cookie remota.
- Sin backend: login cae a modo local.
- Logout limpia cookie si existe y tambien limpia modo local.
- Perfil y home muestran el modo correcto: `local` o `remoto`.

## Partidos y jugadas

- Un usuario sin sesion no puede guardar jugada.
- Un usuario con sesion puede guardar jugada en local siempre.
- Si hay backend, la jugada se persiste en `tickets` y `ticket_allocations`.
- El detalle del partido refleja la jugada guardada del usuario.
- Un mercado ya `revealed` o `settled` no deberia admitir cambios cuando se cierre esa regla en backend.
- Un mercado `scheduled` pero pasado de kickoff debe quedar `locked`.
- Un mercado con partido `live` debe quedar `revealed`.
- Un mercado con partido `finished` y outcome resuelto debe quedar `settled`.
- `process-match` debe poder correr sin pasos manuales intermedios.
- Un partido terminado debe poder ejecutar `sync -> settle -> recompute ranking`.
- `process-all-matches` debe soportar lotes mixtos sin frenar por un solo error.

## Ranking e historial

- Ranking sin snapshots cae a fallback.
- Ranking con snapshots ordena bien.
- Historial muestra netos positivos y negativos correctamente.
- Perfil muestra campeon, neto, jugadas positivas y mejor acierto.

## Build y calidad tecnica

- `pnpm typecheck`
- `pnpm build`
- `pnpm test`
