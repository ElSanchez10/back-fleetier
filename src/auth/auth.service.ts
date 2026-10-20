import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { BdService, Consultar } from '../bd/bd.service.js';
import { cifrarClave, claveCorrecta } from './claves.js';
import { Rol, UsuarioSesion } from './sesion.js';

const HORA_MS = 60 * 60 * 1000;
// "Mantener la sesión iniciada": un mes. Sin marcarlo, la sesión dura una jornada.
export const DURACION_RECORDADA_MS = 30 * 24 * HORA_MS;
const DURACION_NORMAL_MS = 12 * HORA_MS;

// Tras MAX_INTENTOS ingresos fallidos seguidos, el correo queda bloqueado
// hasta que pase la ventana desde el primero.
const MAX_INTENTOS = 5;
const VENTANA_INTENTOS = `interval '15 minutes'`;
const LARGO_MINIMO = 8;

// Desde dónde se abre una sesión: el User-Agent y la IP de la persona.
export interface Dispositivo {
  navegador: string | null;
  ip: string | null;
}

const huella = (token: string) =>
  createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly log = new Logger('Auth');
  // Contraseña con que parte toda cuenta nueva o restablecida. Se entrega a la
  // persona y la app le exige cambiarla en su primer ingreso.
  private readonly claveInicial: string;

  constructor(private readonly bd: BdService) {
    const clave = process.env.CLAVE_INICIAL ?? '';
    if (clave.length < LARGO_MINIMO) {
      throw new Error(
        `Falta la variable de entorno CLAVE_INICIAL (mínimo ${LARGO_MINIMO} caracteres)`,
      );
    }
    this.claveInicial = clave;
  }

  // Si todavía no hay ningún admin, crea el primero con el correo de ADMIN_CORREO
  // y la contraseña inicial. Sin él no habría cómo entrar a crear las demás cuentas.
  async onApplicationBootstrap() {
    const correo = process.env.ADMIN_CORREO?.trim();
    const [{ hay }] = await this.bd.consultar<{ hay: boolean }>(
      `select exists (select 1 from usuario where rol = 'admin') as hay`,
    );
    if (hay) {
      return;
    }
    if (!correo) {
      this.log.warn(
        'No hay ningún admin y falta ADMIN_CORREO: nadie puede iniciar sesión.',
      );
      return;
    }
    await this.crearUsuario(this.bd.consultar.bind(this.bd), {
      nombre: 'Administrador',
      correo,
      rol: 'admin',
      localId: null,
    });
    this.log.log(
      `Se creó el primer admin (${correo}) con la contraseña inicial.`,
    );
  }

  get claveDeInicio(): string {
    return this.claveInicial;
  }

  // Crea una cuenta con la contraseña inicial. Recibe `consultar` para poder
  // ir dentro de la transacción de quien la llama.
  async crearUsuario(
    consultar: Consultar,
    datos: { nombre: string; correo: string; rol: Rol; localId: number | null },
  ): Promise<number> {
    const [{ id }] = await consultar<{ id: number }>(
      `insert into usuario (nombre, email, rol, local_id, clave_hash)
       values ($1, $2, $3, $4, $5) returning id`,
      [
        datos.nombre,
        datos.correo.toLowerCase(),
        datos.rol,
        datos.localId,
        await cifrarClave(this.claveInicial),
      ],
    );
    return id;
  }

  // Deja la cuenta como recién creada: contraseña inicial, cambio obligatorio y
  // todas sus sesiones cerradas.
  async restablecerClave(usuarioId: number): Promise<boolean> {
    const cambiadas = await this.bd.consultar(
      `update usuario set clave_hash = $2, debe_cambiar_clave = true where id = $1 returning id`,
      [usuarioId, await cifrarClave(this.claveInicial)],
    );
    await this.cerrarSesiones(usuarioId);
    return cambiadas.length > 0;
  }

  // Cierra todas las sesiones de una cuenta (por ejemplo, si cambia su rol).
  async cerrarSesiones(usuarioId: number) {
    await this.bd.consultar(`delete from sesion where usuario_id = $1`, [
      usuarioId,
    ]);
  }

  // Comprueba correo y contraseña y abre una sesión. Devuelve el token que va
  // en la cookie; en la base queda solo su huella.
  // `dispositivo`: desde dónde entra, para la lista de sesiones de su cuenta.
  async ingresar(
    correo: string,
    clave: string,
    recordar: boolean,
    dispositivo: Dispositivo,
  ) {
    const llave = correo.toLowerCase();
    await this.exigirPocosFallos(llave);

    const [cuenta] = await this.bd.consultar<{
      id: number;
      claveHash: string;
    }>(
      `select id, clave_hash as "claveHash" from usuario where lower(email) = $1`,
      [llave],
    );
    // Mismo error si el correo no existe o la contraseña no calza: no se revela cuál.
    if (!cuenta || !(await claveCorrecta(clave, cuenta.claveHash))) {
      await this.anotarFallo(llave);
      throw new UnauthorizedException({
        statusCode: 401,
        codigo: 'credenciales_invalidas',
      });
    }
    await this.bd.consultar(`delete from intento_ingreso where email = $1`, [
      llave,
    ]);

    const token = randomBytes(32).toString('base64url');
    const duracion = recordar ? DURACION_RECORDADA_MS : DURACION_NORMAL_MS;
    await this.bd.consultar(
      `insert into sesion (usuario_id, token_hash, expira_en, navegador, ip)
       values ($1, $2, now() + $3 * interval '1 millisecond', $4, $5)`,
      [
        cuenta.id,
        huella(token),
        duracion,
        dispositivo.navegador,
        dispositivo.ip,
      ],
    );
    // De paso se limpian las sesiones vencidas de esta cuenta.
    await this.bd.consultar(
      `delete from sesion where usuario_id = $1 and expira_en < now()`,
      [cuenta.id],
    );
    return { token, usuario: (await this.usuarioDeToken(token))! };
  }

  // El usuario dueño de una sesión vigente, o null. De paso anota que la
  // sesión se usó (a lo más una vez por minuto, para no escribir en cada petición).
  async usuarioDeToken(token: string | null): Promise<UsuarioSesion | null> {
    if (!token) {
      return null;
    }
    const [usuario] = await this.bd.consultar<UsuarioSesion>(
      `with uso as (
         update sesion set ultima_actividad = now()
         where token_hash = $1 and expira_en > now()
           and ultima_actividad < now() - interval '1 minute'
       )
       select u.id,
              u.nombre,
              u.email as correo,
              u.rol,
              u.debe_cambiar_clave as "debeCambiarClave",
              u.local_id as "localId"
       from sesion s
       join usuario u on u.id = s.usuario_id
       where s.token_hash = $1 and s.expira_en > now()`,
      [huella(token)],
    );
    return usuario ?? null;
  }

  async salir(token: string | null) {
    if (token) {
      await this.bd.consultar(`delete from sesion where token_hash = $1`, [
        huella(token),
      ]);
    }
  }

  // Cambia la contraseña de quien tiene la sesión `token`. Cierra sus demás sesiones.
  async cambiarClave(
    usuarioId: number,
    token: string,
    actual: string,
    nueva: string,
  ) {
    const [{ claveHash }] = await this.bd.consultar<{ claveHash: string }>(
      `select clave_hash as "claveHash" from usuario where id = $1`,
      [usuarioId],
    );
    if (!(await claveCorrecta(actual, claveHash))) {
      throw new BadRequestException({
        statusCode: 400,
        codigo: 'clave_actual_incorrecta',
      });
    }
    if (nueva === this.claveInicial || nueva === actual) {
      throw new BadRequestException({
        statusCode: 400,
        codigo: 'clave_nueva_repetida',
      });
    }
    await this.bd.consultar(
      `update usuario set clave_hash = $2, debe_cambiar_clave = false where id = $1`,
      [usuarioId, await cifrarClave(nueva)],
    );
    await this.bd.consultar(
      `delete from sesion where usuario_id = $1 and token_hash <> $2`,
      [usuarioId, huella(token)],
    );
  }

  // Corrige el nombre y el correo de la propia cuenta.
  async actualizarPerfil(usuarioId: number, nombre: string, correo: string) {
    await this.bd.consultar(
      `update usuario set nombre = $2, email = $3 where id = $1`,
      [usuarioId, nombre, correo.toLowerCase()],
    );
  }

  // Las sesiones vigentes de una cuenta, la más reciente primero. `actual`
  // marca la de quien pregunta.
  async sesiones(usuarioId: number, token: string) {
    return this.bd.consultar<{
      navegador: string | null;
      ip: string | null;
      ultimaActividad: string;
      actual: boolean;
    }>(
      `select navegador, ip, ultima_actividad as "ultimaActividad",
              token_hash = $2 as actual
       from sesion
       where usuario_id = $1 and expira_en > now()
       order by token_hash = $2 desc, ultima_actividad desc`,
      [usuarioId, huella(token)],
    );
  }

  // Cierra las demás sesiones de la cuenta, previa confirmación con la contraseña.
  async cerrarOtrasSesiones(usuarioId: number, token: string, clave: string) {
    await this.exigirClave(usuarioId, clave);
    await this.bd.consultar(
      `delete from sesion where usuario_id = $1 and token_hash <> $2`,
      [usuarioId, huella(token)],
    );
  }

  // Elimina la propia cuenta, previa confirmación con la contraseña. Siempre
  // debe quedar al menos un admin.
  async eliminarCuenta(usuarioId: number, clave: string) {
    await this.exigirClave(usuarioId, clave);
    const borradas = await this.bd.consultar(
      `delete from usuario
       where id = $1
         and exists (select 1 from usuario where rol = 'admin' and id <> $1)
       returning id`,
      [usuarioId],
    );
    if (borradas.length === 0) {
      throw new BadRequestException({
        statusCode: 400,
        codigo: 'ultimo_admin',
      });
    }
  }

  private async exigirClave(usuarioId: number, clave: string) {
    const [{ claveHash }] = await this.bd.consultar<{ claveHash: string }>(
      `select clave_hash as "claveHash" from usuario where id = $1`,
      [usuarioId],
    );
    if (!(await claveCorrecta(clave, claveHash))) {
      throw new BadRequestException({
        statusCode: 400,
        codigo: 'clave_incorrecta',
      });
    }
  }

  // Los ingresos fallidos se cuentan en la base (tabla intento_ingreso), no en
  // memoria: así el bloqueo sobrevive a un reinicio del back.
  private async exigirPocosFallos(llave: string) {
    const [fila] = await this.bd.consultar<{ fallos: number }>(
      `select fallos from intento_ingreso
       where email = $1 and desde > now() - ${VENTANA_INTENTOS}`,
      [llave],
    );
    if (fila && fila.fallos >= MAX_INTENTOS) {
      throw new HttpException(
        { statusCode: 429, codigo: 'demasiados_intentos' },
        429,
      );
    }
  }

  private async anotarFallo(llave: string) {
    // Si la ventana anterior ya pasó, la cuenta parte de nuevo.
    await this.bd.consultar(
      `insert into intento_ingreso (email) values ($1)
       on conflict (email) do update set
         fallos = case when intento_ingreso.desde > now() - ${VENTANA_INTENTOS}
                       then intento_ingreso.fallos + 1 else 1 end,
         desde  = case when intento_ingreso.desde > now() - ${VENTANA_INTENTOS}
                       then intento_ingreso.desde else now() end`,
      [llave],
    );
    // También quedan filas de correos que no existen: se botan las vencidas.
    await this.bd.consultar(
      `delete from intento_ingreso where desde < now() - ${VENTANA_INTENTOS}`,
    );
  }
}
