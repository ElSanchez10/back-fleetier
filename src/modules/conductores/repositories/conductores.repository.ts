import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@/common/database/database.service';
import { contiene, patron } from '@/common/database/sql.util';
import type { ConductorDto } from '../dto/conductor.request.dto';
import type { FiltroConductoresDto } from '../dto/filtro-conductores.query.dto';
import type { RangoDto } from '../dto/rango.query.dto';
import { DIA_RUTA } from '@/modules/rutas/repositories/rutas.sql';
import type {
  ActividadEnLocalRow,
  ConductorRow,
  ResumenConductoresRow,
  RutaDeConductorRow,
} from '../interfaces/conductor-row.interface';

// Acceso a los datos de los conductores, para ConductoresService. Aquí no se
// decide nada: solo se lee y se escribe.

// El conductor `d` tiene una ruta abierta (en espera o en ejecución).
export const OCUPADO = `exists (
  select 1 from ruta r
  where r.conductor_id = d.id and r.estado in ('en_espera', 'en_ejecucion'))`;

// El conductor `d` anda en una ruta que ya partió.
export const EN_RUTA = `exists (
  select 1 from ruta r where r.conductor_id = d.id and r.estado = 'en_ejecucion')`;

// Los conductores son de una ciudad, no de un local: una cuenta con local ve
// los de la ciudad de su local. `parametro` es el número ($n) que lleva el
// local de la cuenta (null si no tiene: ve todos).
export function enSuCiudad(parametro: string): string {
  return `(${parametro}::int is null
           or d.ciudad_id = (select ciudad_id from local where id = ${parametro}))`;
}

const SELECT_CONDUCTOR = `
  select d.id,
         d.nombre,
         d.run,
         d.fecha_nacimiento,
         d.telefono,
         d.email,
         d.ciudad_id,
         c.nombre as ciudad,
         d.tipo_conductor_id,
         t.nombre as tipo_conductor,
         ${OCUPADO} as ocupado,
         u.ruta as ultima_ruta
  from conductor d
  join ciudad c on c.id = d.ciudad_id
  join tipo_conductor t on t.id = d.tipo_conductor_id
  left join lateral (
    select json_build_object(
             'id', r.id,
             'fecha', to_char(r.fecha at time zone 'America/Santiago', 'YYYY-MM-DD"T"HH24:MI'),
             'estado', r.estado,
             'local', l.nombre,
             'ciudad', lc.nombre) as ruta
    from ruta r
    join local l on l.id = r.local_id
    join ciudad lc on lc.id = l.ciudad_id
    where r.conductor_id = d.id
    order by r.fecha desc, r.id desc
    limit 1
  ) u on true`;

// $1 texto, $2 tipo, $3 ciudad pedida, $4 local de la cuenta, $5 solo libres.
// El RUN también se encuentra escrito con puntos: se le quitan antes de comparar.
const DONDE = `
  where (${contiene('d.nombre', '$1')}
         or ${contiene('d.email', '$1')}
         or d.telefono like $1
         or d.run ilike replace($1, '.', ''))
    and ($2::int is null or d.tipo_conductor_id = $2)
    and ($3::int is null or d.ciudad_id = $3)
    and ${enSuCiudad('$4')}
    and ($5::boolean is not true or not ${OCUPADO})`;

const parametros = (q: FiltroConductoresDto, localId: number | null) => [
  patron(q.buscar),
  q.tipoConductorId ?? null,
  q.ciudadId ?? null,
  localId,
  q.libres ?? null,
];

@Injectable()
export class ConductoresRepository {
  constructor(private readonly bd: DatabaseService) {}

  // `localId`: el de la cuenta; ve los conductores de la ciudad de ese local.
  async listar(q: FiltroConductoresDto, localId: number | null) {
    const filtros = parametros(q, localId);
    const [items, [{ total }]] = await Promise.all([
      this.bd.consultar<ConductorRow>(
        `${SELECT_CONDUCTOR} ${DONDE} order by lower(d.nombre), d.id limit $6 offset $7`,
        [...filtros, q.limite, q.desde],
      ),
      this.bd.consultar<{ total: number }>(
        `select count(*)::int as total from conductor d ${DONDE}`,
        filtros,
      ),
    ]);
    return { items, total };
  }

  todos(q: FiltroConductoresDto, localId: number | null, maximo: number) {
    return this.bd.consultar<ConductorRow>(
      `${SELECT_CONDUCTOR} ${DONDE} order by lower(d.nombre), d.id limit ${maximo}`,
      parametros(q, localId),
    );
  }

  // Disponible: sin ruta abierta. En ruta: su ruta ya partió.
  async resumen(localId: number | null): Promise<ResumenConductoresRow> {
    const [resumen] = await this.bd.consultar<ResumenConductoresRow>(
      `select count(*)::int as total,
              count(*) filter (where not ${OCUPADO})::int as disponibles,
              count(*) filter (where ${EN_RUTA})::int as en_ruta
       from conductor d
       where ${enSuCiudad('$1')}`,
      [localId],
    );
    return resumen;
  }

  async porId(
    id: number,
    localId: number | null,
  ): Promise<ConductorRow | undefined> {
    const [conductor] = await this.bd.consultar<ConductorRow>(
      `${SELECT_CONDUCTOR} where d.id = $1 and ${enSuCiudad('$2')}`,
      [id, localId],
    );
    return conductor;
  }

  async insertar(dto: ConductorDto): Promise<number> {
    const [{ id }] = await this.bd.consultar<{ id: number }>(
      `insert into conductor (nombre, run, fecha_nacimiento, telefono, email, ciudad_id, tipo_conductor_id)
       values ($1, $2, $3, $4, $5, $6, $7) returning id`,
      [
        dto.nombre,
        dto.run,
        dto.fechaNacimiento,
        dto.telefono,
        dto.email,
        dto.ciudadId,
        dto.tipoConductorId,
      ],
    );
    return id;
  }

  async actualizar(id: number, dto: ConductorDto) {
    await this.bd.consultar(
      `update conductor
       set nombre = $2, run = $3, fecha_nacimiento = $4, telefono = $5,
           email = $6, ciudad_id = $7, tipo_conductor_id = $8
       where id = $1`,
      [
        id,
        dto.nombre,
        dto.run,
        dto.fechaNacimiento,
        dto.telefono,
        dto.email,
        dto.ciudadId,
        dto.tipoConductorId,
      ],
    );
  }

  // Sus rutas en un rango de días (las muestra su calendario).
  rutas(id: number, rango: RangoDto): Promise<RutaDeConductorRow[]> {
    return this.bd.consultar<RutaDeConductorRow>(
      `select r.id,
              to_char(r.fecha at time zone 'America/Santiago', 'YYYY-MM-DD"T"HH24:MI') as fecha,
              r.ordenes,
              r.estado,
              l.nombre as local
       from ruta r
       join local l on l.id = r.local_id
       where r.conductor_id = $1 and ${DIA_RUTA} between $2 and $3
       order by r.fecha, r.id`,
      [id, rango.desde, rango.hasta],
    );
  }

  // Órdenes y rutas por local en el rango.
  actividadPorLocal(
    id: number,
    rango: RangoDto,
  ): Promise<ActividadEnLocalRow[]> {
    return this.bd.consultar<ActividadEnLocalRow>(
      `select l.nombre as local,
              c.nombre as ciudad,
              count(*)::int as rutas,
              sum(r.ordenes)::int as ordenes
       from ruta r
       join local l on l.id = r.local_id
       join ciudad c on c.id = l.ciudad_id
       where r.conductor_id = $1 and ${DIA_RUTA} between $2 and $3
       group by l.id, l.nombre, c.nombre
       order by ordenes desc, lower(l.nombre)`,
      [id, rango.desde, rango.hasta],
    );
  }
}
