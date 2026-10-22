import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import type { Entorno } from '@/common/config/env.validation';
import {
  DatabaseService,
  type Consultar,
} from '@/common/database/database.service';
import type { UsuarioSesion } from '@/common/interfaces/usuario-sesion.interface';
import {
  AuthRepository,
  type DatosCuenta,
} from './repositories/auth.repository';
import { cifrarClave, claveCorrecta } from './utils/claves.util';

import { SesionAbiertaResponseDto } from './dto/sesion.response.dto';
const HORA_MS = 60 * 60 * 1000;
// "Mantener la sesión iniciada": un mes. Sin marcarlo, la sesión dura una jornada.
export const DURACION_RECORDADA_MS = 30 * 24 * HORA_MS;
const DURACION_NORMAL_MS = 12 * HORA_MS;

// Tras MAX_INTENTOS ingresos fallidos seguidos, el correo queda bloqueado
// hasta que pase la ventana desde el primero.
const MAX_INTENTOS = 5;

// Desde dónde se abre una sesión: el User-Agent y la IP de la persona.
export interface Dispositivo {
  navegador: string | null;
  ip: string | null;
}

const huella = (token: string) =>
  createHash('sha256').update(token).digest('hex');

// Cuentas y sesiones: aquí se decide (contraseñas, duración de la sesión,
// bloqueo por intentos, último admin); AuthRepository lee y escribe.
@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly log = new Logger(AuthService.name);
  // Contraseña con que parte toda cuenta nueva o restablecida. Se entrega a la
  // persona y la app le exige cambiarla en su primer ingreso.
  private readonly claveInicial: string;

  constructor(
    private readonly bd: DatabaseService,
    private readonly datos: AuthRepository,
    private readonly config: ConfigService<Entorno, true>,
  ) {
    // Ya validada al arrancar (mínimo 8 caracteres).
    this.claveInicial = config.get('CLAVE_INICIAL', { infer: true });
  }

  // Si todavía no hay ningún admin, crea el primero con el correo de ADMIN_CORREO
  // y la contraseña inicial. Sin él no habría cómo entrar a crear las demás cuentas.
  async onApplicationBootstrap() {
    const correo = this.config.get('ADMIN_CORREO', { infer: true })?.trim();
    if (await this.datos.hayAdmin()) {
      return;
    }
    if (!correo) {
      this.log.warn(
        'No hay ningún admin y falta ADMIN_CORREO: nadie puede iniciar sesión.',
      );
      return;
    }
    await this.crearUsuario(this.bd.consultar, {
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
    datos: DatosCuenta,
  ): Promise<number> {
    return this.datos.insertarUsuario(
      consultar,
      datos,
      await cifrarClave(this.claveInicial),
    );
  }

  // Deja la cuenta como recién creada: contraseña inicial, cambio obligatorio y
  // todas sus sesiones cerradas.
  async restablecerClave(usuarioId: number): Promise<boolean> {
    const existe = await this.datos.guardarClave(
      usuarioId,
      await cifrarClave(this.claveInicial),
      true,
    );
    await this.datos.cerrarSesiones(usuarioId);
    return existe;
  }

  // Cierra todas las sesiones de una cuenta (por ejemplo, si cambia su rol).
  async cerrarSesiones(usuarioId: number) {
    await this.datos.cerrarSesiones(usuarioId);
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
    if ((await this.datos.fallosRecientes(llave)) >= MAX_INTENTOS) {
      throw new HttpException({ codigo: 'demasiados_intentos' }, 429);
    }

    const cuenta = await this.datos.cuentaPorCorreo(llave);
    // Mismo error si el correo no existe o la contraseña no calza: no se revela cuál.
    if (!cuenta || !(await claveCorrecta(clave, cuenta.clave_hash))) {
      await this.datos.anotarFallo(llave);
      throw new UnauthorizedException({
        codigo: 'credenciales_invalidas',
      });
    }
    await this.datos.olvidarFallos(llave);

    const token = randomBytes(32).toString('base64url');
    await this.datos.abrirSesion(
      cuenta.id,
      huella(token),
      recordar ? DURACION_RECORDADA_MS : DURACION_NORMAL_MS,
      dispositivo.navegador,
      dispositivo.ip,
    );
    // De paso se limpian las sesiones vencidas de esta cuenta.
    await this.datos.borrarSesionesVencidas(cuenta.id);
    return { token, usuario: (await this.usuarioDeToken(token))! };
  }

  // El usuario dueño de una sesión vigente, o null.
  async usuarioDeToken(token: string | null): Promise<UsuarioSesion | null> {
    if (!token) {
      return null;
    }
    const fila = await this.datos.usuarioDeSesion(huella(token));
    return fila
      ? {
          id: fila.id,
          nombre: fila.nombre,
          correo: fila.email,
          rol: fila.rol,
          debeCambiarClave: fila.debe_cambiar_clave,
          localId: fila.local_id,
        }
      : null;
  }

  async salir(token: string | null) {
    if (token) {
      await this.datos.cerrarSesion(huella(token));
    }
  }

  // Cambia la contraseña de quien tiene la sesión `token`. Cierra sus demás
  // sesiones. La nueva no puede ser la inicial ni la misma de antes.
  async cambiarClave(
    usuarioId: number,
    token: string,
    actual: string,
    nueva: string,
  ) {
    if (!(await this.claveCalza(usuarioId, actual))) {
      throw new BadRequestException({
        codigo: 'clave_actual_incorrecta',
      });
    }
    if (nueva === this.claveInicial || nueva === actual) {
      throw new BadRequestException({
        codigo: 'clave_nueva_repetida',
      });
    }
    await this.datos.guardarClave(usuarioId, await cifrarClave(nueva), false);
    await this.datos.cerrarSesiones(usuarioId, huella(token));
  }

  // Corrige el nombre y el correo de la propia cuenta.
  async actualizarPerfil(usuarioId: number, nombre: string, correo: string) {
    await this.datos.actualizarPerfil(usuarioId, nombre, correo);
  }

  // Las sesiones vigentes de una cuenta; `actual` marca la de quien pregunta.
  async sesiones(
    usuarioId: number,
    token: string,
  ): Promise<SesionAbiertaResponseDto[]> {
    const filas = await this.datos.sesiones(usuarioId, huella(token));
    return filas.map(SesionAbiertaResponseDto.fromRow);
  }

  // Cierra las demás sesiones de la cuenta, previa confirmación con la contraseña.
  async cerrarOtrasSesiones(usuarioId: number, token: string, clave: string) {
    await this.exigirClave(usuarioId, clave);
    await this.datos.cerrarSesiones(usuarioId, huella(token));
  }

  // Elimina la propia cuenta, previa confirmación con la contraseña. Siempre
  // debe quedar al menos un admin.
  async eliminarCuenta(usuarioId: number, clave: string) {
    await this.exigirClave(usuarioId, clave);
    if (!(await this.datos.eliminarSiQuedaOtroAdmin(usuarioId))) {
      throw new BadRequestException({
        codigo: 'ultimo_admin',
      });
    }
  }

  private async claveCalza(usuarioId: number, clave: string) {
    const claveHash = await this.datos.claveHash(usuarioId);
    return !!claveHash && (await claveCorrecta(clave, claveHash));
  }

  private async exigirClave(usuarioId: number, clave: string) {
    if (!(await this.claveCalza(usuarioId, clave))) {
      throw new BadRequestException({
        codigo: 'clave_incorrecta',
      });
    }
  }
}
