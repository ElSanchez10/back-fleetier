import { Injectable } from '@nestjs/common';
import type { Consultar } from '../bd/bd.service.js';
import type { EstadoCooler } from '../coolers/cooler.dto.js';
import type { EstadoRuta, RutaDto } from './ruta.dto.js';
import { desdeHoraLocal } from './rutas.sql.js';

// Acceso a los datos de las rutas y sus coolers, para OperacionesService. Aquí
// no se decide nada: solo se lee y se escribe. Todo corre dentro de la
// transacción de quien llama (`sql`), y lo que se lee para cambiarlo se
// bloquea (`for update`) hasta que la transacción termine.

export interface RutaBloqueada {
  id: number;
  localId: number;
  conductorId: number | null;
  estado: EstadoRuta;
}

export interface CoolerDeRutaBloqueado {
  coolerId: number;
  devuelto: boolean;
}

export type DatosRuta = Pick<
  RutaDto,
  'localId' | 'conductorId' | 'fecha' | 'ordenes'
>;

@Injectable()
export class RutasRepositorio {
  async bloquearRuta(
    sql: Consultar,
    id: number,
  ): Promise<RutaBloqueada | undefined> {
    const [ruta] = await sql<RutaBloqueada>(
      `select id, local_id as "localId", conductor_id as "conductorId", estado
       from ruta where id = $1 for update`,
      [id],
    );
    return ruta;
  }

  async insertarRuta(sql: Consultar, datos: DatosRuta): Promise<number> {
    const [{ id }] = await sql<{ id: number }>(
      `insert into ruta (local_id, conductor_id, fecha, ordenes)
       values ($1, $2, ${desdeHoraLocal('$3')}, $4)
       returning id`,
      [datos.localId, datos.conductorId, datos.fecha, datos.ordenes],
    );
    return id;
  }

  async actualizarRuta(sql: Consultar, id: number, datos: DatosRuta) {
    await sql(
      `update ruta
       set local_id = $2, conductor_id = $3, fecha = ${desdeHoraLocal('$4')}, ordenes = $5
       where id = $1`,
      [id, datos.localId, datos.conductorId, datos.fecha, datos.ordenes],
    );
  }

  async cambiarEstadoRuta(sql: Consultar, id: number, estado: EstadoRuta) {
    await sql('update ruta set estado = $2 where id = $1', [id, estado]);
  }

  // Los coolers de la ruta, devueltos o no.
  async coolersDeRuta(
    sql: Consultar,
    rutaId: number,
  ): Promise<CoolerDeRutaBloqueado[]> {
    return sql<CoolerDeRutaBloqueado>(
      `select cooler_id as "coolerId", devuelto
       from ruta_cooler where ruta_id = $1 for update`,
      [rutaId],
    );
  }

  async bloquearCooler(
    sql: Consultar,
    id: number,
  ): Promise<EstadoCooler | undefined> {
    const [cooler] = await sql<{ estado: EstadoCooler }>(
      'select estado from cooler where id = $1 for update',
      [id],
    );
    return cooler?.estado;
  }

  async cambiarEstadoCooler(sql: Consultar, id: number, estado: EstadoCooler) {
    await sql('update cooler set estado = $2 where id = $1', [id, estado]);
  }

  // Los coolers que la ruta lleva sin devolver pasan a `estado`. Devuelve
  // cuántos eran.
  async cambiarEstadoSinDevolver(
    sql: Consultar,
    rutaId: number,
    estado: EstadoCooler,
  ): Promise<number> {
    const cambiados = await sql(
      `update cooler set estado = $2
       where id in (select cooler_id from ruta_cooler where ruta_id = $1 and not devuelto)
       returning id`,
      [rutaId, estado],
    );
    return cambiados.length;
  }

  // La ruta que tiene al cooler sin devolver, si hay una.
  async rutaDelCooler(
    sql: Consultar,
    coolerId: number,
  ): Promise<{ id: number; estado: EstadoRuta } | undefined> {
    const [ruta] = await sql<{ id: number; estado: EstadoRuta }>(
      `select r.id, r.estado
       from ruta_cooler rc
       join ruta r on r.id = rc.ruta_id
       where rc.cooler_id = $1 and not rc.devuelto
       for update of r, rc`,
      [coolerId],
    );
    return ruta;
  }

  async agregarCooler(sql: Consultar, rutaId: number, coolerId: number) {
    await sql('insert into ruta_cooler (ruta_id, cooler_id) values ($1, $2)', [
      rutaId,
      coolerId,
    ]);
  }

  async sacarCooler(sql: Consultar, rutaId: number, coolerId: number) {
    await sql('delete from ruta_cooler where ruta_id = $1 and cooler_id = $2', [
      rutaId,
      coolerId,
    ]);
  }

  async marcarDevuelto(sql: Consultar, rutaId: number, coolerId: number) {
    await sql(
      `update ruta_cooler set devuelto = true, devuelto_en = now()
       where ruta_id = $1 and cooler_id = $2`,
      [rutaId, coolerId],
    );
  }
}
