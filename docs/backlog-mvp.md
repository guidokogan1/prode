# Backlog MVP

## P0 - Imprescindible

### Producto y reglas

- Definir copy final del juego para onboarding y ayuda corta.
- Cerrar numero final del tope por outcome.
- Cerrar regla exacta del mercado campeon.
- Cerrar criterio de settlement para partidos suspendidos o reprogramados.

### Base de aplicacion

- Inicializar app web mobile-first.
- Configurar routing principal.
- Configurar tema visual base y tokens de UI.
- Preparar PWA basica.

### Usuarios

- Crear flujo de ingreso con `nombre + PIN`.
- Persistir sesion local del usuario.
- Evitar duplicados evidentes de nombre dentro del grupo.

### Datos del Mundial

- Modelar equipos, grupos, fases y partidos.
- Ingestar fixture oficial del Mundial.
- Guardar horarios en UTC y mostrar hora local.
- Traer banderas de seleccion.

### Core del juego

- Permitir crear y editar una jugada hasta kickoff.
- Validar suma exacta de `10.000`.
- Validar tope por outcome.
- Soportar mercado `1x2` y mercado `clasifica`.
- Bloquear jugadas al inicio real.
- Revelar jugadas al bloqueo.
- Resolver partido y calcular settlement.
- Guardar resultado neto por usuario y partido.
- Recalcular ranking general.

### Pantallas

- Home MVP.
- Lista de partidos.
- Detalle de partido.
- Ranking.
- Historial personal.

## P1 - Muy importante

### Calidad de juego

- Mostrar consenso del grupo una vez revelado.
- Mostrar variacion de ranking despues de cada settlement.
- Mostrar mejor acierto y peor golpe del usuario.
- Agregar mercado campeon.

### Operacion

- Crear jobs de sincronizacion de partidos.
- Crear admin minimo para corregir lock/reveal/settlement.
- Agregar logs de settlement.

### UX

- Estados vacios y skeletons.
- Confirmacion visual de jugada guardada.
- Timer hacia kickoff.
- Explicacion corta de calculo del resultado.

## P2 - Deseable

### Datos extra

- Forma reciente de cada seleccion.
- TV/canal en Argentina cuando haya dato confiable.
- Info de estadio y sede.

### Engagement

- Notificaciones web para jugadas pendientes.
- Recordatorio antes del inicio del partido.
- Alertas de reveal.

### Ranking y social

- Ranking por fase.
- Feed de actividad reciente.
- Badges simples.

## Criterios de salida de MVP

El MVP esta listo cuando:

- un usuario puede entrar con nombre + PIN
- puede ver el fixture del Mundial
- puede cargar su jugada para un partido
- la jugada se bloquea al iniciar el partido
- se revelan las jugadas de todos
- al finalizar el partido se calcula el resultado neto correctamente
- la tabla general se actualiza sin intervencion manual
