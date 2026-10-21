import { Injectable } from '@nestjs/common';
import { BdService } from '../bd/bd.service.js';
import { contiene, HOY, ordenarPor, patron } from '../comun/sql.js';
import type { EstadoRuta, FiltroRutasDto, ProblemaDto } from './ruta.dto.js';
import { DIA_RUTA, horaLocal, type Ruta, SELECT_RUTA } from './rutas.sql.js';

// Lo que se lee de las rutas (listados, detalle) y sus problemas, para
// RutasService, ProblemasService y DevolucionesService. Los cambios de estado
// van por RutasRepositorio. Aquí no se decide nada.

export interface FiltrosRuta {
  buscar?: string;
  // El número de ruta, si lo buscado es un número.
  numero: number | null;
  fechaDesde: string | null;
  fechaHasta: string | null;
  estado: EstadoRuta | null;
  localId: number | null;
}

export interface CoolerLeido {
  id: number;
  nombre: string;
  codigo: string;
  color: string;
  estado: string;
  localId: number;
  local: string;
}

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

const DATOS_PROBLEMA = `id, cantidad, descripcion, ${horaLocal('creado_en')} as "creadoEn"`;

@Injectable()
export class RutasConsultasRepositorio {
  constructor(private readonly bd: BdService) {}

  async listar(f: FiltrosRuta, q: FiltroRutasDto) {
    const filtros = parametros(f);
    const [items, [{ total }]] = await Promise.all([
      this.bd.consultar<Ruta>(
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

  todas(f: FiltrosRuta, maximo: number): Promise<Ruta[]> {
    return this.bd.consultar<Ruta>(
      `${SELECT_RUTA} ${DONDE} order by r.fecha desc, r.id desc limit ${maximo}`,
      parametros(f),
    );
  }

  // Cuántas rutas de hoy hay en cada estado.
  async resumenDeHoy(localId: number | null) {
    const [resumen] = await this.bd.consultar(
      `select ${HOY}::text as fecha,
              count(*) filter (where estado = 'en_espera')::int as "enEspera",
              count(*) filter (where estado = 'en_ejecucion')::int as "enEjecucion",
              count(*) filter (where estado = 'pendiente')::int as pendientes,
              count(*) filter (where estado = 'finalizada')::int as finalizadas
       from ruta r
       where ${DIA_RUTA} = ${HOY} and ($1::int is null or r.local_id = $1)`,
      [localId],
    );
    return resumen;
  }

  // `localId` null: de cualquier local.
  async porId(id: number, localId: number | null): Promise<Ruta | undefined> {
    const [ruta] = await this.bd.consultar<Ruta>(
      `${SELECT_RUTA} where r.id = $1 and ($2::int is null or r.local_id = $2)`,
      [id, localId],
    );
    return ruta;
  }

  coolersDeRuta(id: number) {
    return this.bd.consultar(
      `select k.id, k.nombre, k.codigo, k.estado, t.color, rc.devuelto,
              ${horaLocal('rc.devuelto_en')} as "devueltoEn"
       from ruta_cooler rc
       join cooler k on k.id = rc.cooler_id
       join tipo_cooler t on t.id = k.tipo_cooler_id
       where rc.ruta_id = $1
       order by length(k.nombre), lower(k.nombre), k.id`,
      [id],
    );
  }

  problemasDeRuta(id: number) {
    return this.bd.consultar(
      `select ${DATOS_PROBLEMA} from problema_ruta where ruta_id = $1 order by id`,
      [id],
    );
  }

  async insertarProblema(rutaId: number, dto: ProblemaDto) {
    const [problema] = await this.bd.consultar(
      `insert into problema_ruta (ruta_id, cantidad, descripcion) values ($1, $2, $3)
       returning ${DATOS_PROBLEMA}`,
      [rutaId, dto.cantidad, dto.descripcion],
    );
    return problema;
  }

  // undefined si no existe en esa ruta.
  async actualizarProblema(
    rutaId: number,
    problemaId: number,
    dto: ProblemaDto,
  ) {
    const [problema] = await this.bd.consultar(
      `update problema_ruta set cantidad = $3, descripcion = $4
       where id = $1 and ruta_id = $2
       returning ${DATOS_PROBLEMA}`,
      [problemaId, rutaId, dto.cantidad, dto.descripcion],
    );
    return problema;
  }

  async eliminarProblema(rutaId: number, problemaId: number): Promise<boolean> {
    const borrados = await this.bd.consultar(
      'delete from problema_ruta where id = $1 and ruta_id = $2 returning id',
      [problemaId, rutaId],
    );
    return borrados.length > 0;
  }

  // El cooler que leyó la pistola, de cualquier local.
  async coolerPorCodigo(codigo: string): Promise<CoolerLeido | undefined> {
    const [cooler] = await this.bd.consultar<CoolerLeido>(
      `select k.id, k.nombre, k.codigo, t.color, k.estado,
              k.local_id as "localId", l.nombre as local
       from cooler k
       join tipo_cooler t on t.id = k.tipo_cooler_id
       join local l on l.id = k.local_id
       where k.codigo = $1`,
      [codigo],
    );
    return cooler;
  }
}
