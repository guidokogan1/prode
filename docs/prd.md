# Prode Mundial 2026 - PRD MVP

## 1. Resumen

Producto web mobile-first para jugar el Mundial 2026 entre amigos con una mecanica de pool por partido. No es un prode clasico de puntajes por marcador: en cada partido, cada jugador reparte `10.000` creditos entre los resultados posibles. Cuando termina el partido, el pozo total se redistribuye entre quienes apostaron al resultado correcto, proporcional a cuanto pusieron en ese outcome.

El objetivo del producto es ser:

- rapido de entender
- facil de usar desde el celular
- divertido incluso para gente que no sabe mucho de futbol
- visualmente premium
- barato o gratis de operar para un grupo chico

## 2. Problema

El prode clasico tiene varios problemas para este caso:

- requiere entender reglas de puntos
- suele ser aburrido visualmente
- una vez cargados los resultados, hay poca tension partido a partido
- no premia tanto leer bien un batacazo o ir contra la mayoria

Este producto busca convertir cada partido en una decision corta y entretenida, con ranking dinamico y reveal social de las jugadas.

## 3. Objetivo del MVP

Lanzar una primera version jugable para un grupo de amigos durante el Mundial 2026 con:

- ingreso por `nombre + PIN`
- fixture del Mundial
- carga de jugadas por partido
- lock y reveal automaticos al inicio real del partido
- settlement automatico al terminar
- ranking por ganancia acumulada
- apuesta separada al campeon
- experiencia mobile-first tipo app

## 4. Mecanica del juego

### 4.1 Credito por partido

- Cada partido tiene un credito fijo de `10.000`.
- El credito existe solo para ese partido.
- No se acumula como saldo ni billetera.
- El usuario debe repartir exactamente `10.000` entre los outcomes disponibles.

### 4.2 Fase de grupos

Outcomes:

- gana equipo A
- empate
- gana equipo B

### 4.3 Fase eliminatoria

Outcomes:

- clasifica equipo A
- clasifica equipo B

La resolucion incluye:

- tiempo reglamentario
- alargue
- penales

### 4.4 Distribucion de la jugada

- El total de la jugada debe sumar `10.000`.
- Un outcome puede recibir hasta `10.000` (jugada concentrada permitida).
- Los presets sugeridos son:

En 1X2, si elegis local o visitante (selected / empate / otro lado):

- Suave: `5.000` · `3.000` · `2.000`
- Media: `7.000` · `3.000` · `0`
- Fuerte: `9.000` · `1.000` · `0`

En 1X2, si elegis empate (empate / lado / lado):

- Suave: `4.000` · `3.000` · `3.000`
- Media: `6.000` · `2.000` · `2.000`
- Fuerte: `8.000` · `1.000` · `1.000`

En mercados de dos resultados (selected / otro):

- Suave: `6.000` · `4.000`
- Media: `8.000` · `2.000`
- Fuerte: `10.000` · `0`

### 4.5 Settlement

Al terminar un partido:

- se suma todo lo apostado por todos los jugadores en ese partido
- se identifica el outcome ganador
- el pozo se reparte entre quienes pusieron creditos en ese outcome
- cada jugador ve solo el resultado neto de su jugada

Formula:

- `pozo_total = suma de todas las apuestas del partido`
- `pozo_ganador = suma de apuestas en el outcome correcto`
- `cobro = pozo_total * (apuesta_del_usuario_en_outcome_ganador / pozo_ganador)`
- `resultado_neto = cobro - 10.000`

### 4.6 Apuesta al campeon

- Mercado separado del resto.
- Se carga antes del partido inaugural.
- Se cierra al inicio oficial del Mundial.
- Tiene pozo propio.
- Se liquida al final del torneo.

## 5. Reglas de visibilidad

- Cada usuario puede editar su jugada hasta antes del inicio oficial del partido.
- Cuando arranca el partido, la jugada se bloquea.
- Desde ese momento se revelan las jugadas de todos para ese partido.

## 6. Ranking

La tabla general ordena por `ganancia acumulada`.

Datos visibles por jugador:

- posicion
- nombre
- ganancia acumulada
- variacion reciente
- cantidad de jugadas positivas
- mejor acierto

Desempates:

1. mayor ganancia acumulada
2. mayor cantidad de jugadas positivas
3. mayor ganancia en una sola jugada
4. acierto del campeon
5. empate compartido

## 7. Usuarios

Para el MVP no hay usuario con mail y password.

Ingreso:

- nombre
- PIN corto

Objetivos:

- baja friccion
- suficiente proteccion para grupo de amigos
- simpleza operativa

## 8. Pantallas MVP

### Inicio

- proximos partidos
- partidos en vivo
- alertas de jugadas pendientes
- top del ranking
- card del mercado campeon

### Partidos

- fixture completo
- agrupado por fecha y fase
- estado del partido
- indicador de si ya jugaste o no

### Detalle de partido

- equipos, banderas, hora y fase
- estado del partido
- modulo `Tu jugada`
- reparto de `10.000` creditos
- reveal de jugadas cuando arranca
- resultado neto al finalizar

### Ranking

- tabla general
- foco en ganancia acumulada

### Historial

- feed de jugadas propias
- resultado de cada una

### Ingreso

- nombre
- PIN

## 9. Requisitos no funcionales

- mobile-first real
- rapido de cargar
- legible con una mano
- sin complejidad innecesaria
- auditable en los calculos
- barato de operar

## 10. Fuera del MVP

- TV/canales por partido como feature confiable
- estadisticas avanzadas
- chat
- multiples torneos
- cuotas complejas
- notificaciones push completas
- panel social avanzado

## 11. Riesgos

- datos en vivo con latencia si se usan proveedores gratuitos
- edge cases en kickoff real vs programado
- settlement incorrecto si falla la fuente de resultados
- confusion del usuario si el copy habla de billetera o saldo

## 12. Tono de producto

No debe parecer casino ni sitio de apuestas tradicional.

Debe sentirse como:

- una app de deporte premium
- simple de entender
- competitiva
- social
- elegante
