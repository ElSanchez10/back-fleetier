import { Injectable } from '@nestjs/common';
import { BdService, type Consultar } from '../bd/bd.service.js';
import type { Rol, UsuarioSesion } from './sesion.js';

// Acceso a las cuentas, sesiones e intentos de ingreso, para AuthService.
// Aquí no se decide nada: solo se lee y se escribe. Los tokens llegan ya como
// huella (sha256); el token mismo nunca llega a la base.

export interface DatosCuenta {
  nombre: string;
  correo: string;
  rol: Rol;
  localId: number | null;
}

export interface SesionAbierta {
  navegador: string | null;
  ip: string | null;
  ultimaActividad: string;
  actual: boolean;
}

// Ventana en que se cuentan los ingresos fallidos.
const VENTANA_INTENTOS = `interval '15 minutes'`;

@Injectable()
export class AuthRepositorio {
  constructor(private readonly bd: BdService) {}

  async hayAdmin(): Promise<boolean> {
    const [{ hay }] = await this.bd.consultar<{ hay: boolean }>(
      `select exists (select 1 from usuario where rol = 'admin') as hay`,
    );
    return hay;
  }

  // Recibe `sql` para poder ir dentro de la transacción de quien la llama.
  async insertarUsuario(
    sql: Consultar,
    datos: DatosCuenta,
    claveHash: string,
  ): Promise<number> {
    const [{ id }] = await sql<{ id: number }>(
      `insert into usuario (nombre, email, rol, local_id, clave_hash)
       values ($1, $2, $3, $4, $5) returning id`,
      [
        datos.nombre,
        datos.correo.toLowerCase(),
        datos.rol,
        datos.localId,
        claveHash,
      ],
    );
    return id;
  }

  // false si no existe.
  async guardarClave(
    usuarioId: number,
    claveHash: string,
    debeCambiar: boolean,
  ): Promise<boolean> {
    const cambiadas = await this.bd.consultar(
      `update usuario set clave_hash = $2, debe_cambiar_clave = $3 where id = $1 returning id`,
      [usuarioId, claveHash, debeCambiar],
    );
    return cambiadas.length > 0;
  }

  async cuentaPorCorreo(
    correo: string,
  ): Promise<{ id: number; claveHash: string } | undefined> {
    const [cuenta] = await this.bd.consultar<{ id: number; claveHash: string }>(
      `select id, clave_hash as "claveHash" from usuario where lower(email) = $1`,
      [correo],
    );
    return cuenta;
  }

  async claveHash(usuarioId: number): Promise<string | undefined> {
    const [cuenta] = await this.bd.consultar<{ claveHash: string }>(
      `select clave_hash as "claveHash" from usuario where id = $1`,
      [usuarioId],
    );
    return cuenta?.claveHash;
  }

  async actualizarPerfil(usuarioId: number, nombre: string, correo: string) {
    await this.bd.consultar(
      `update usuario set nombre = $2, email = $3 where id = $1`,
      [usuarioId, nombre, correo.toLowerCase()],
    );
  }

  // Solo si queda otro admin. false si no se borró.
  async eliminarSiQuedaOtroAdmin(usuarioId: number): Promise<boolean> {
    const borradas = await this.bd.consultar(
      `delete from usuario
       where id = $1
         and exists (select 1 from usuario where rol = 'admin' and id <> $1)
       returning id`,
      [usuarioId],
    );
    return borradas.length > 0;
  }

  // --- Sesiones ---

  async abrirSesion(
    usuarioId: number,
    huella: string,
    duracionMs: number,
    navegador: string | null,
    ip: string | null,
  ) {
    await this.bd.consultar(
      `insert into sesion (usuario_id, token_hash, expira_en, navegador, ip)
       values ($1, $2, now() + $3 * interval '1 millisecond', $4, $5)`,
      [usuarioId, huella, duracionMs, navegador, ip],
    );
  }

  async borrarSesionesVencidas(usuarioId: number) {
    await this.bd.consultar(
      `delete from sesion where usuario_id = $1 and expira_en < now()`,
      [usuarioId],
    );
  }

  // El dueño de una sesión vigente. De paso anota que la sesión se usó (a lo
  // más una vez por minuto, para no escribir en cada petición).
  async usuarioDeSesion(huella: string): Promise<UsuarioSesion | undefined> {
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
      [huella],
    );
    return usuario;
  }

  async cerrarSesion(huella: string) {
    await this.bd.consultar(`delete from sesion where token_hash = $1`, [
      huella,
    ]);
  }

  // Todas las de la cuenta, menos la de `huellaQueQueda` si viene.
  async cerrarSesiones(
    usuarioId: number,
    huellaQueQueda: string | null = null,
  ) {
    await this.bd.consultar(
      `delete from sesion
       where usuario_id = $1 and ($2::text is null or token_hash <> $2)`,
      [usuarioId, huellaQueQueda],
    );
  }

  // Las vigentes, la de `huellaActual` primero y luego la más reciente.
  sesiones(usuarioId: number, huellaActual: string): Promise<SesionAbierta[]> {
    return this.bd.consultar<SesionAbierta>(
      `select navegador, ip, ultima_actividad as "ultimaActividad",
              token_hash = $2 as actual
       from sesion
       where usuario_id = $1 and expira_en > now()
       order by token_hash = $2 desc, ultima_actividad desc`,
      [usuarioId, huellaActual],
    );
  }

  // --- Ingresos fallidos (se guardan en la base para que el bloqueo
  // sobreviva a un reinicio del back) ---

  // Los fallos seguidos del correo dentro de la ventana.
  async fallosRecientes(correo: string): Promise<number> {
    const [fila] = await this.bd.consultar<{ fallos: number }>(
      `select fallos from intento_ingreso
       where email = $1 and desde > now() - ${VENTANA_INTENTOS}`,
      [correo],
    );
    return fila?.fallos ?? 0;
  }

  // Suma un fallo; si la ventana anterior ya pasó, la cuenta parte de nuevo.
  // También bota las filas vencidas (quedan de correos que no existen).
  async anotarFallo(correo: string) {
    await this.bd.consultar(
      `insert into intento_ingreso (email) values ($1)
       on conflict (email) do update set
         fallos = case when intento_ingreso.desde > now() - ${VENTANA_INTENTOS}
                       then intento_ingreso.fallos + 1 else 1 end,
         desde  = case when intento_ingreso.desde > now() - ${VENTANA_INTENTOS}
                       then intento_ingreso.desde else now() end`,
      [correo],
    );
    await this.bd.consultar(
      `delete from intento_ingreso where desde < now() - ${VENTANA_INTENTOS}`,
    );
  }

  async olvidarFallos(correo: string) {
    await this.bd.consultar(`delete from intento_ingreso where email = $1`, [
      correo,
    ]);
  }
}
