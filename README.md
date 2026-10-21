# back-dsl

API de DSL: NestJS sobre Postgres, con SQL directo (`pg`). El esquema de la
base vive en `bd-dsl`; este repositorio solo la consulta.

## Desarrollo

Requiere Node 24 (`nvm use` lee `.nvmrc`) y una base con las instalaciones de
`bd-dsl` aplicadas.

Lo más simple es usar `../local.sh`, que crea una base temporal y levanta el
back contra ella:

```bash
../local.sh base
../local.sh back        # http://localhost:3000/api
```

A mano:

```bash
npm install
cp .env.example .env    # y completar el bloque "fuera de Docker" (PGHOST, PGPORT…)
npm run start:dev       # lee las variables de .env
npm run lint
npm test
```

## Estructura

| Carpeta | Contenido |
|---|---|
| `src/bd/` | conexión a Postgres |
| `src/auth/` | inicio de sesión, contraseñas y permisos por rol |
| `src/comun/` | traducción de errores de la base a respuestas HTTP, paginación y utilidades de SQL |
| `src/salud/` | `GET /api/salud`: responde solo si la base contesta |
| `src/usuarios/` | administración de cuentas (solo admin): crear, editar, restablecer la contraseña y eliminar |
| `src/catalogos/` | lo que se administra en Configuración: ciudades, locales, destinos, tipos de cooler, clasificación de conductores y tipos de evento |
| `src/coolers/` | inventario de coolers: listado con filtros, ficha, alta, edición y etiquetas con código de barras en PDF |
| `src/conductores/` | conductores: listado con filtros, ficha, alta y edición; los eventos de su calendario, sus cuentas en aplicaciones externas (cifradas) y sus rutas |
| `src/rutas/` | rutas de reparto: listado, resumen del día, registro, edición, inicio, cierre, problemas y retorno de coolers |
| `src/registros/` | lo demás que se anota en Actividad: pedidos especiales, atrasos y casos excepcionales |
| `src/resumen/` | indicadores de la pantalla de inicio y actividad de cada local en un mes |

Cada módulo de la app (rutas…) agrega su carpeta en `src/`, separada en tres
capas:

- `*.controller.ts`: recibe la petición, revisa el rol (`@Roles`) y arma la
  respuesta (JSON, planilla o PDF). No decide ni tiene SQL.
- `*.service.ts`: las reglas del negocio (qué local ve cada cuenta, quién
  puede corregir qué, cuándo una ruta queda finalizada…).
- `*.repositorio.ts`: el SQL. Solo lee y escribe; no decide nada.

Las pruebas (`*.spec.ts`, `npm test`) prueban los servicios con repositorios
emulados (mocks o datos en memoria): no se conectan a ninguna base de datos.
El apoyo común está en `src/comun/pruebas.ts`. El SQL de los repositorios se
comprueba contra el back corriendo en local (`local.sh`).

## Alcance por local

`src/comun/alcance.ts` aplica la regla del local en todos los módulos:
`localVisible()` da el local por el que hay que filtrar un listado y
`exigirLocal()` rechaza (`403 otro_local`) crear o modificar algo de otro
local. Un registro de otro local se responde igual que uno que no existe (`404`).

## Coolers

- `GET /api/coolers` acepta además `estado` y `localId`, y junto con el tramo
  devuelve un `resumen` (total, disponibles y en ruta) de todo lo que la cuenta
  puede ver.
- Registrar: `admin` y `encargado`. El cooler nace disponible y el back le
  asigna un código de barras de ocho dígitos. En vez de `tipoCoolerId` puede
  venir `tipoNuevo` (`marca`, `capacidad`, `color`): el tipo se crea junto con
  el cooler, como en la versión Laravel. Editar (incluidos código y
  estado): solo `admin`.
- Etiquetas (`admin`, `asistente` y `encargado`): `GET /api/coolers/etiquetas`
  entrega un PDF con las de todos los coolers que cumplen el filtro y
  `GET /api/coolers/:id/etiqueta`, la de uno. Son Code 128, armadas con
  `bwip-js` y `pdfkit` (`src/coolers/etiquetas.ts`).
- `GET /api/coolers/:id/barras.svg` es el código de barras como imagen, para la
  ficha.
- `GET /api/coolers/codigo/:codigo` busca el cooler que leyó la pistola (de
  cualquier local: el front avisa si es de otro) y `GET /api/coolers/:id/rutas`,
  las rutas que ha hecho (por tramos).
- Los estados de ruta (en espera, en ruta, pendiente) no se ponen a mano:
  responde `409 cooler_estado_de_ruta`. Cualquier otro sí, aunque el cooler
  esté en una ruta: sale de ella como si hubiera vuelto (`OperacionesService.liberar`) y,
  si era el último que faltaba, la ruta queda finalizada.

## Conductores

- Son de una ciudad, no de un local: una cuenta con local ve los de la ciudad
  de su local. `GET /api/conductores` acepta además `tipoConductorId` y
  `ciudadId`, busca por nombre, RUN, correo o teléfono y devuelve un `resumen`:
  disponibles (sin ruta abierta) y en ruta (su ruta ya partió). Con
  `libres=true` trae solo los que no tienen una ruta abierta. Cada conductor
  trae su `ultimaRuta`.
- `GET /api/conductores/:id/rutas` y `.../actividad` (con `desde` y `hasta`):
  sus rutas, para el calendario, y las órdenes por local.
- Registrar y editar: `admin` y `asistente`. El RUN se guarda sin puntos y con
  guion (`12345678-K`) y se valida su dígito verificador (`src/conductores/run.ts`).
- Eventos del calendario (`/api/conductores/:id/eventos`): los lee quien puede
  ver al conductor, con `?desde=AAAA-MM-DD&hasta=AAAA-MM-DD`; los anotan,
  corrigen y eliminan `admin` y `asistente`. En vez de `tipoEventoId` puede
  venir `tipoNuevo` (`nombre`, `color`): como la opción "Otro" de la versión
  Laravel, el tipo se crea junto con el evento.
- Cuentas en aplicaciones externas (`/api/conductores/:id/cuentas`): solo
  `admin` y `asistente` (eliminar, solo `admin`). La contraseña se guarda
  cifrada con AES-256-GCM (`src/conductores/cifrado.ts`) y no viaja en el
  listado: se pide una a la vez en `GET .../cuentas/:cuentaId/clave`.
- La llave del cifrado sale de `CLAVE_CUENTAS`. Sin ella el back parte igual,
  pero las cuentas responden `503 cifrado_no_configurado`. **No se cambia una
  vez en uso y hay que guardarla aparte de los respaldos de la base**: si se
  pierde, las contraseñas guardadas no se pueden recuperar.

## Rutas

- Estados: `en_espera` (pre-cargada), `en_ejecucion`, `pendiente` (cerrada con
  coolers que no volvieron) y `finalizada`. Los cambios de estado de rutas y
  coolers los decide `src/rutas/operaciones.service.ts` y los guarda
  `rutas.repositorio.ts`: cada operación es una transacción que bloquea
  (`for update`) las filas que toca. Las pruebas del servicio usan un
  repositorio en memoria, sin base de datos. La base asegura
  con índices únicos que un conductor no quede en dos rutas abiertas ni un
  cooler en dos rutas sin devolver.
- Lo que manda es que los coolers vuelvan: cuando le vuelven todos, la ruta
  queda finalizada aunque nadie la haya cerrado. Un cooler que se lee para otra
  ruta sale de la que lo tenía (si ya partió, cuenta como devuelto). Un cooler
  de otro local se puede usar y sigue siendo de su local. Uno dañado o no
  disponible no se sube a una ruta ni se devuelve: lo cambia un `admin`.
- Todos los roles ven las rutas (una cuenta con local, las de su local). Las
  operan `admin`, `encargado` y `coordinador`. Como en Laravel, una ruta que ya
  partió solo la corrige un `admin` (`403 ruta_ya_partio`), y a una ya cerrada
  no se le cambian los coolers.
- El conductor: una cuenta con local elige entre los de su ciudad; un `admin`,
  de cualquier ciudad. Al corregir una ruta solo se revisa un conductor nuevo,
  no el que ya tenía.
- `GET /api/rutas` filtra por días (`fechaDesde`, `fechaHasta`), `estado` y
  `localId`, y busca por conductor o número de ruta. `GET /api/rutas/resumen`
  cuenta las rutas de hoy por estado.
- `POST /api/rutas` registra la ruta con sus coolers; con `iniciar: true` parte
  de inmediato. `PUT /api/rutas/:id` deja los coolers como dice la lista
  enviada. `POST .../iniciar` y `POST .../cerrar` cambian el estado.
- `POST /api/devoluciones` (`{ codigo }`) registra un cooler que volvió: queda
  disponible y devuelto en la ruta que lo tenga (`ruta`, o `null` si no estaba
  en ninguna). Sirve al cerrar una ruta, para un cooler que vuelve días
  después y para uno de otro local (`otroLocal`).
- Problemas de una ruta (`/api/rutas/:id/problemas`): los anotan y corrigen
  quienes operan rutas; los elimina solo `admin`.
- Las fechas con hora viajan como `AAAA-MM-DDTHH:MM` en hora de Chile; en la
  base se guardan con zona horaria.

## Pedidos especiales, atrasos y casos

Registros sueltos de un local en un día (`fecha`, hasta hoy). Todos se listan
con `?fechaDesde&fechaHasta&localId` y los elimina solo `admin`.

- `/api/pedidos-especiales`: los cuatro roles los anotan y corrigen. Solo
  `admin` y `asistente` ven y fijan el `precio`, marcan `extraordinario` y
  agregan un destino nuevo escrito en `otroDestino`. Para los demás, el precio
  es el base del destino y no pueden corregir un pedido extraordinario. Filtra
  por `extraordinario` y busca por destino o descripción.
- `/api/atrasos` (`despacho` o `picking`) y `/api/casos` (de un conductor): los
  anotan y corrigen `admin`, `encargado` y `coordinador`. Los atrasos se
  filtran por `tipo`; los casos se buscan por conductor o descripción.

## Catálogos

Los catálogos son listas cortas: `GET` las devuelve completas, sin tramos, y
las puede leer cualquier rol (las usan los formularios). Crear (`POST`), editar
(`PUT /:id`) y eliminar (`DELETE /:id`) es solo para admin. Todos comparten
`src/catalogos/mantenedor.ts`; cada controlador solo declara su tabla y sus
columnas. Un elemento en uso no se elimina: la llave foránea lo impide y la
respuesta es un `409` con el nombre de esa llave.

Una cuenta con local recibe en `GET /api/locales` solo el suyo.

## Sesión y permisos

- Se entra con correo y contraseña en `POST /api/sesion`. La sesión viaja en una
  cookie `HttpOnly`; en la base queda solo la huella del token (tabla `sesion`).
- Toda la API exige sesión (`src/auth/auth.guard.ts`). Una ruta sin marcar es
  solo para `admin`; se abre a otros roles con `@Roles(...)` y al público con
  `@Publico()`.
- Los roles son `admin`, `asistente`, `encargado` y `coordinador`.
- `encargado` y `coordinador` siempre tienen un local (`localId`), como en
  Laravel: solo ven y modifican lo de ese local. `admin` y `asistente` no
  tienen local y ven todos.
- Toda cuenta nace con la contraseña de `CLAVE_INICIAL` y debe cambiarla al
  entrar; mientras no lo haga, solo puede usar `/api/sesion`.
- El primer admin lo crea el back al partir, con el correo de `ADMIN_CORREO`.
- Un admin crea las demás cuentas y restablece contraseñas (`/api/usuarios`).
  Solo `encargado` y `coordinador` pueden tener local. Nadie cambia su propio
  rol ni elimina su propia cuenta desde `/api/usuarios`.
- "Administrar Cuenta" (como en la versión Laravel): `PUT /api/sesion` corrige
  el nombre y el correo propios; `GET /api/sesion/dispositivos` lista las
  sesiones abiertas (navegador, IP y última actividad); `POST
  /api/sesion/cerrar-otras` las cierra y `POST /api/sesion/eliminar-cuenta`
  (solo admin) borra la propia cuenta. Las dos últimas piden la contraseña, y
  la cuenta no se borra si es el único admin (`ultimo_admin`).
- Tras cinco ingresos fallidos seguidos, el correo queda bloqueado 15 minutos.
  La cuenta se lleva en la base (tabla `intento_ingreso`), así que sobrevive a
  un reinicio del back.

## Listados

Todo listado se pide por tramos y se busca en el back (`src/comun/paginacion.ts`):
`?limite=30&desde=0&buscar=texto`. La respuesta es `{ items, total }`, donde
`total` cuenta todas las filas que cumplen el filtro. La búsqueda no distingue
mayúsculas ni tildes.

Rutas, pedidos especiales, atrasos y casos se ordenan además por columna con
`&orden=fecha&sentido=asc` (`ordenarPor` en `src/comun/sql.ts`): cada listado
dice qué columnas admite y un `orden` que no está entre ellas se ignora. Sin
`orden` van de la fecha más reciente a la más antigua. Los usuarios se ordenan
igual (`id`, `nombre`, `correo`, `local`); sin `orden` van por `id`.

## Planillas Excel

Rutas, pedidos especiales, atrasos, casos, coolers y conductores tienen
`GET .../excel` con los mismos filtros que su listado: entrega un `.xlsx` con
todas las filas que cumplen el filtro (no un tramo). Lo mismo
`GET /api/resumen/locales/excel?mes=AAAA-MM`. Las descargan `admin`,
`asistente` y `encargado`, como en Laravel. Las arma `src/comun/excel.ts` con
`exceljs`: títulos en negrita, primera fila fija, filtro en cada columna y
fechas como fechas de Excel (en hora de Chile). Las columnas, el nombre de la
hoja y el del archivo ("Historial Rutas (Generado 15-10-2026).xlsx") son los
de la versión Laravel.

Las etiquetas de los coolers (`GET /api/coolers/etiquetas` y
`GET /api/coolers/:id/etiqueta`) salen en un PDF A4 apaisado, cuatro por fila,
como en Laravel (`all-barcode.pdf` y `barcode.pdf`).

`package.json` fuerza `uuid` ≥ 11.1.1 (`overrides`): `exceljs` trae una versión
con un aviso de seguridad, aunque no usa la parte afectada.

## Inicio

`GET /api/resumen` entrega lo que está pasando ahora: rutas en ejecución,
rutas pendientes, coolers disponibles, conductores en ruta y los coolers por
estado. `GET /api/resumen/locales?mes=AAAA-MM&ciudadId&localId` suma, por local,
las rutas que salieron en el mes y sus órdenes (sin contar las que siguen en
espera).

## Errores

Las reglas del negocio las valida el back: si una falla, responde con un
`codigo` (`ruta_cerrada`, `cooler_no_disponible`…) que el front traduce a un
mensaje. Si lo que falla es una restricción de la base (llave, check o índice
único), la API responde `409` (o `400` para un check) con el nombre de la
restricción (`ciudad_nombre_uk`).

## Despliegue

Jenkins ejecuta el `Jenkinsfile` en cada push a `main`. Usa la credencial
`dsl-env`, la misma de `bd-dsl`.

En un servidor sin Jenkins:

```bash
cp .env.example .env    # y completar
docker compose up -d --build
```

Necesita la base de `bd-dsl` ya desplegada (crea la red `dsl_interna`) y un
Traefik con la red externa `proxy`. El dominio no está escrito en el
repositorio: lo define `APP_HOST`.
