import { Injectable } from '@nestjs/common';
import { BdService, type Consultar } from '../bd/bd.service.js';
import { contiene, ordenarPor, patron } from '../comun/sql.js';
import { DIA_RUTA } from '../rutas/rutas.sql.js';
import type { TipoCoolerDto } from '../catalogos/catalogo.dto.js';
import type { EstadoCooler, FiltroRutasCoolerDto } from './cooler.dto.js';

// Acceso a los datos de los coolers, para CoolersService. Aquí no se decide
// nada: solo se lee y se escribe.

export interface Cooler {
  id: number;
  nombre: string;
  codigo: string;
  fechaAdquisicion: string;
  tieneTapa: boolean;
  estado: EstadoCooler;
  tipoCoolerId: number;
  marca: string;
  capacidad: string;
  color: string;
  localId: number;
  local: string;
  ciudad: string;
}

// Lo que filtra el listado, las etiquetas y la planilla. `localId` null: todos.
export interface FiltrosCooler {
  buscar?: string;
  estado: EstadoCooler | null;
  localId: number | null;
}

export interface ResumenCoolers {
  total: number;
  disponibles: number;
  enRuta: number;
}

export interface DatosCooler {
  nombre: string;
  fechaAdquisicion: string;
  tieneTapa: boolean;
  tipoCoolerId: number;
  localId: number;
}

const SELECT_COOLER = `
  select k.id,
         k.nombre,
         k.codigo,
         k.fecha_adquisicion as "fechaAdquisicion",
         k.tiene_tapa as "tieneTapa",
         k.estado,
         k.tipo_cooler_id as "tipoCoolerId",
         t.marca,
         t.capacidad,
         t.color,
         k.local_id as "localId",
         l.nombre as local,
         c.nombre as ciudad
  from cooler k
  join tipo_cooler t on t.id = k.tipo_cooler_id
  join local l on l.id = k.local_id
  join ciudad c on c.id = l.ciudad_id`;

// $1 texto, $2 estado, $3 local.
const DONDE = `
  where ${contiene('k.nombre', '$1')}
    and ($2::estado_cooler is null or k.estado = $2)
    and ($3::int is null or k.local_id = $3)`;

// Primero por estado; dentro de él, por número ("2" antes que "10").
const ORDEN = 'k.estado, length(k.nombre), lower(k.nombre), k.id';

const HORA_LOCAL = (columna: string) =>
  `to_char(${columna} at time zone 'America/Santiago', 'YYYY-MM-DD"T"HH24:MI')`;

const parametros = (f: FiltrosCooler) => [
  patron(f.buscar),
  f.estado,
  f.localId,
];

@Injectable()
export class CoolersRepositorio {
  constructor(private readonly bd: BdService) {}

  listar(f: FiltrosCooler, limite: number, desde: number): Promise<Cooler[]> {
    return this.bd.consultar<Cooler>(
      `${SELECT_COOLER} ${DONDE} order by ${ORDEN} limit $4 offset $5`,
      [...parametros(f), limite, desde],
    );
  }

  async contar(f: FiltrosCooler): Promise<number> {
    const [{ total }] = await this.bd.consultar<{ total: number }>(
      `select count(*)::int as total from cooler k ${DONDE}`,
      parametros(f),
    );
    return total;
  }

  // Todos los que cumplen el filtro, hasta `maximo` (etiquetas y planilla).
  todos(f: FiltrosCooler, maximo: number): Promise<Cooler[]> {
    return this.bd.consultar<Cooler>(
      `${SELECT_COOLER} ${DONDE} order by ${ORDEN} limit ${maximo}`,
      parametros(f),
    );
  }

  async resumen(localId: number | null): Promise<ResumenCoolers> {
    const [resumen] = await this.bd.consultar<ResumenCoolers>(
      `select count(*)::int as total,
              count(*) filter (where estado = 'disponible')::int as disponibles,
              count(*) filter (where estado = 'en_ruta')::int as "enRuta"
       from cooler
       where $1::int is null or local_id = $1`,
      [localId],
    );
    return resumen;
  }

  async porCodigo(codigo: string): Promise<Cooler | undefined> {
    const [cooler] = await this.bd.consultar<Cooler>(
      `${SELECT_COOLER} where k.codigo = $1`,
      [codigo],
    );
    return cooler;
  }

  // `localId` null: de cualquier local.
  async porId(id: number, localId: number | null): Promise<Cooler | undefined> {
    const [cooler] = await this.bd.consultar<Cooler>(
      `${SELECT_COOLER} where k.id = $1 and ($2::int is null or k.local_id = $2)`,
      [id, localId],
    );
    return cooler;
  }

  // Las rutas que ha hecho el cooler en un rango de días.
  async rutas(id: number, q: FiltroRutasCoolerDto) {
    // $1 cooler, $2 desde, $3 hasta.
    const donde = `
      where rc.cooler_id = $1
        and ($2::date is null or ${DIA_RUTA} >= $2)
        and ($3::date is null or ${DIA_RUTA} <= $3)`;
    const filtros = [id, q.fechaDesde ?? null, q.fechaHasta ?? null];
    const [items, [{ total }]] = await Promise.all([
      this.bd.consultar(
        `select r.id,
                ${HORA_LOCAL('r.fecha')} as fecha,
                r.estado,
                l.nombre as local,
                r.conductor_id as "conductorId",
                d.nombre as conductor,
                rc.devuelto,
                ${HORA_LOCAL('rc.devuelto_en')} as "devueltoEn"
         from ruta_cooler rc
         join ruta r on r.id = rc.ruta_id
         join local l on l.id = r.local_id
         left join conductor d on d.id = r.conductor_id
         ${donde}
         ${ordenarPor(q, { fecha: 'r.fecha' }, 'r.fecha desc, r.id desc', 'r.id')}
         limit $4 offset $5`,
        [...filtros, q.limite, q.desde],
      ),
      this.bd.consultar<{ total: number }>(
        `select count(*)::int as total
         from ruta_cooler rc join ruta r on r.id = rc.ruta_id ${donde}`,
        filtros,
      ),
    ]);
    return { items, total };
  }

  // Con `tipoNuevo`, el tipo se crea en la misma sentencia: o quedan los dos o
  // ninguno. Si el código ya existe, falla con cooler_codigo_uk.
  async insertar(
    datos: DatosCooler,
    codigo: string,
    tipoNuevo?: TipoCoolerDto,
  ): Promise<number> {
    const [{ id }] = await this.bd.consultar<{ id: number }>(
      `with tipo as (
         insert into tipo_cooler (marca, capacidad, color)
         select $7, $8::capacidad_cooler, $9::color where $7::text is not null
         returning id
       )
       insert into cooler (nombre, codigo, fecha_adquisicion, tiene_tapa, tipo_cooler_id, local_id)
       values ($1, $2, $3, $4, coalesce((select id from tipo), $5::int), $6)
       returning id`,
      [
        datos.nombre,
        codigo,
        datos.fechaAdquisicion,
        datos.tieneTapa,
        tipoNuevo ? null : datos.tipoCoolerId,
        datos.localId,
        tipoNuevo?.marca ?? null,
        tipoNuevo?.capacidad ?? null,
        tipoNuevo?.color ?? null,
      ],
    );
    return id;
  }

  // Todo menos el estado, que lo maneja OperacionesService.liberar.
  async actualizar(
    sql: Consultar,
    id: number,
    datos: DatosCooler & { codigo: string },
  ) {
    await sql(
      `update cooler
       set nombre = $2, codigo = $3, fecha_adquisicion = $4, tiene_tapa = $5,
           tipo_cooler_id = $6, local_id = $7
       where id = $1`,
      [
        id,
        datos.nombre,
        datos.codigo,
        datos.fechaAdquisicion,
        datos.tieneTapa,
        datos.tipoCoolerId,
        datos.localId,
      ],
    );
  }
}
