import { Injectable } from '@nestjs/common';
import {
  DatabaseService,
  type Consultar,
} from '@/common/database/database.service';
import { contiene, HOY, ordenarPor, patron } from '@/common/database/sql.util';
import type { Pagina } from '@/common/dto/pagina.response.dto';
import type { EstadoCooler } from '@/modules/coolers/enums/estado-cooler.enum';
import type { FiltroRutasDto } from '../dto/filtro-rutas.query.dto';
import type { RutaDto } from '../dto/ruta.request.dto';
import type { EstadoRuta } from '../enums/estado-ruta.enum';
import type { FiltrosRuta } from '../interfaces/filtros-ruta.interface';
import type {
  CoolerDeRutaBloqueadoRow,
  CoolerDeRutaRow,
  ResumenRutasHoyRow,
  RutaBloqueadaRow,
  RutaDelCoolerRow,
  RutaRow,
} from '../interfaces/ruta-row.interface';
import { DIA_RUTA, desdeHoraLocal, horaLocal, SELECT_RUTA } from './rutas.sql';

// Acceso a los datos de las rutas y sus coolers, para RutasService (lo que se
// lee: listados, detalle) y OperacionesService (los cambios de estado). Aquí
// no se decide nada: solo se lee y se escribe.
//
// Los métodos que reciben `sql` corren dentro de la transacción de quien llama,
// y lo que leen para cambiarlo lo bloquean (`for update`) hasta que termine.

export type DatosRuta = Pick<
  RutaDto,
  'localId' | 'conductorId' | 'fecha' | 'ordenes'
>;

// $1 texto (conductor), $2 número de ruta, $3 desde, $4 hasta, $5 estado, $6 local.
const DONDE = `
  where (${contiene("coalesce(d.nombre, '')", '$1')} or r.id = $2::int)
    and ($3::date is null or ${DIA_RUTA} >= $3)
    and ($4::date is null or ${DIA_RUTA} <= $4)
    and ($5::estado_ruta is null or r.estado = $5)
    and ($6::int is null or r.local_id = $6)`;

// Columnas por las que se ordena el historial.
const ORDEN = {
  id: 'r.id',
  fecha: 'r.fecha',
  local: 'lower(l.nombre)',
  estado: 'r.estado',
};

const parametros = (f: FiltrosRuta) => [
  patron(f.buscar),
  f.numero,
  f.fechaDesde,
  f.fechaHasta,
  f.estado,
  f.localId,
];

@Injectable()
export class RutasRepository {
  constructor(private readonly bd: DatabaseService) {}

  // --- Lecturas ---

  async listar(f: FiltrosRuta, q: FiltroRutasDto): Promise<Pagina<RutaRow>> {
    const filtros = parametros(f);
    const [items, [{ total }]] = await Promise.all([
      this.bd.consultar<RutaRow>(
        `${SELECT_RUTA} ${DONDE}
         ${ordenarPor(q, ORDEN, 'r.fecha desc, r.id desc', 'r.id')}
         limit $7 offset $8`,
        [...filtros, q.limite, q.desde],
      ),
      this.bd.consultar<{ total: number }>(
        `select count(*)::int as total
         from ruta r left join conductor d on d.id = r.conductor_id ${DONDE}`,
        filtros,
      ),
    ]);
    return { items, total };
  }

  todas(f: FiltrosRuta, maximo: number): Promise<RutaRow[]> {
    return this.bd.consultar<RutaRow>(
      `${SELECT_RUTA} ${DONDE} order by r.fecha desc, r.id desc limit ${maximo}`,
      parametros(f),
    );
  }

  // Cuántas rutas de hoy hay en cada estado.
  async resumenDeHoy(localId: number | null): Promise<ResumenRutasHoyRow> {
    const [resumen] = await this.bd.consultar<ResumenRutasHoyRow>(
      `select ${HOY}::text as fecha,
              count(*) filter (where estado = 'en_espera')::int as en_espera,
              count(*) filter (where estado = 'en_ejecucion')::int as en_ejecucion,
              count(*) filter (where estado = 'pendiente')::int as pendientes,
              count(*) filter (where estado = 'finalizada')::int as finalizadas
       from ruta r
       where ${DIA_RUTA} = ${HOY} and ($1::int is null or r.local_id = $1)`,
      [localId],
    );
    return resumen;
  }

  // `localId` null: de cualquier local.
  async porId(
    id: number,
    localId: number | null,
  ): Promise<RutaRow | undefined> {
    const [ruta] = await this.bd.consultar<RutaRow>(
      `${SELECT_RUTA} where r.id = $1 and ($2::int is null or r.local_id = $2)`,
      [id, localId],
    );
    return ruta;
  }

  coolersDeRuta(id: number): Promise<CoolerDeRutaRow[]> {
    return this.bd.consultar<CoolerDeRutaRow>(
      `select k.id, k.nombre, k.codigo, k.estado, t.color, rc.devuelto,
              ${horaLocal('rc.devuelto_en')} as devuelto_en
       from ruta_cooler rc
       join cooler k on k.id = rc.cooler_id
       join tipo_cooler t on t.id = k.tipo_cooler_id
       where rc.ruta_id = $1
       order by length(k.nombre), lower(k.nombre), k.id`,
      [id],
    );
  }

  // --- Dentro de la transacción de OperacionesService ---

  async bloquearRuta(
    sql: Consultar,
    id: number,
  ): Promise<RutaBloqueadaRow | undefined> {
    const [ruta] = await sql<RutaBloqueadaRow>(
      `select id, local_id, conductor_id, estado
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
  bloquearCoolersDeRuta(
    sql: Consultar,
    rutaId: number,
  ): Promise<CoolerDeRutaBloqueadoRow[]> {
    return sql<CoolerDeRutaBloqueadoRow>(
      `select cooler_id, devuelto
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
  ): Promise<RutaDelCoolerRow | undefined> {
    const [ruta] = await sql<RutaDelCoolerRow>(
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
