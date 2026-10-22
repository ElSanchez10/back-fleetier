import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@/common/database/database.service';
import type { CuentaRow } from '../interfaces/cuenta-row.interface';

// Acceso a las cuentas de los conductores, para CuentasService. La contraseña
// llega y sale cifrada: cifrar y descifrar lo decide el servicio.

@Injectable()
export class CuentasRepository {
  constructor(private readonly bd: DatabaseService) {}

  listar(conductorId: number): Promise<CuentaRow[]> {
    return this.bd.consultar<CuentaRow>(
      `select id, cuenta, usuario
       from cuenta_conductor where conductor_id = $1 order by lower(cuenta), id`,
      [conductorId],
    );
  }

  async claveCifrada(
    conductorId: number,
    cuentaId: number,
  ): Promise<string | undefined> {
    const [cuenta] = await this.bd.consultar<{ clave_cifrada: string }>(
      `select clave_cifrada
       from cuenta_conductor where id = $1 and conductor_id = $2`,
      [cuentaId, conductorId],
    );
    return cuenta?.clave_cifrada;
  }

  async insertar(
    conductorId: number,
    cuenta: string,
    usuario: string,
    claveCifrada: string,
  ): Promise<CuentaRow> {
    const [nueva] = await this.bd.consultar<CuentaRow>(
      `insert into cuenta_conductor (conductor_id, cuenta, usuario, clave_cifrada)
       values ($1, $2, $3, $4) returning id, cuenta, usuario`,
      [conductorId, cuenta, usuario, claveCifrada],
    );
    return nueva;
  }

  // `claveCifrada` null deja la que estaba. undefined si no existe.
  async actualizar(
    conductorId: number,
    cuentaId: number,
    cuenta: string,
    usuario: string,
    claveCifrada: string | null,
  ): Promise<CuentaRow | undefined> {
    const [editada] = await this.bd.consultar<CuentaRow>(
      `update cuenta_conductor
       set cuenta = $3, usuario = $4, clave_cifrada = coalesce($5, clave_cifrada)
       where id = $1 and conductor_id = $2 returning id, cuenta, usuario`,
      [cuentaId, conductorId, cuenta, usuario, claveCifrada],
    );
    return editada;
  }

  async eliminar(conductorId: number, cuentaId: number): Promise<boolean> {
    const borradas = await this.bd.consultar(
      'delete from cuenta_conductor where id = $1 and conductor_id = $2 returning id',
      [cuentaId, conductorId],
    );
    return borradas.length > 0;
  }
}
