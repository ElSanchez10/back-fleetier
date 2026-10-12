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

Cada módulo de la app (coolers, conductores, rutas…) agrega su carpeta en `src/`.

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
- Una cuenta puede pertenecer a un local (`localId`): en ese caso solo ve y
  modifica lo de ese local. Sin local, ve todos.
- Toda cuenta nace con la contraseña de `CLAVE_INICIAL` y debe cambiarla al
  entrar; mientras no lo haga, solo puede usar `/api/sesion`.
- El primer admin lo crea el back al partir, con el correo de `ADMIN_CORREO`.
- Un admin crea las demás cuentas y restablece contraseñas (`/api/usuarios`).
  Solo `encargado` y `coordinador` pueden tener local. Nadie cambia su propio
  rol ni elimina su propia cuenta: así siempre queda al menos un admin.
- Tras cinco ingresos fallidos seguidos, el correo queda bloqueado 15 minutos.
  La cuenta se lleva en la base (tabla `intento_ingreso`), así que sobrevive a
  un reinicio del back.

## Listados

Todo listado se pide por tramos y se busca en el back (`src/comun/paginacion.ts`):
`?limite=30&desde=0&buscar=texto`. La respuesta es `{ items, total }`, donde
`total` cuenta todas las filas que cumplen el filtro. La búsqueda no distingue
mayúsculas ni tildes.

## Errores

Cuando una regla de la base falla, la API responde `409` con un `codigo` que el
front traduce a un mensaje: el texto del `raise` o el nombre de la restricción
(`ciudad_nombre_uk`).

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
