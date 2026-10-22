import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@/common/database/database.service';
import { contiene, ordenarPor, patron } from '@/common/database/sql.util';
import type { FiltroRegistrosDto } from '../../dto/filtro-registros.query.dto';
import { DONDE_COMUN, filtrosComunes } from '../../repositories/registros.sql';
import type { CasoDto } from '../dto/caso.request.dto';
import type { CasoRow } from '../interfaces/caso-row.interface';

// Acceso a los datos de los casos excepcionales, para CasosService.

const SELECT_CASO = `
  select x.id, x.fecha, x.local_id, l.nombre as local, c.nombre as ciudad,
         x.conductor_id, d.nombre as conductor, x.descripcion
  from caso_excepcional x
  join local l on l.id = x.local_id
  join ciudad c on c.id = l.ciudad_id
  join conductor d on d.id = x.conductor_id`;

// Tras los comunes: $4 texto (conductor o descripción).
const DONDE = `
  where ${DONDE_COMUN}
    and (${contiene('d.nombre', '$4')} or ${contiene('x.descripcion', '$4')})`;

// Columnas por las que se ordena el listado.
const ORDEN = {
  id: 'x.id',
  fecha: 'x.fecha',
  local: 'lower(l.nombre)',
  conductor: 'lower(d.nombre)',
};

// $1..$4 de DONDE.
const parametros = (q: FiltroRegistrosDto, localId: number | null) => [
  ...filtrosComunes(q, localId),
  patron(q.buscar),
];

@Injectable()
export class CasosRepository {
  constructor(private readonly bd: DatabaseService) {}

  async listar(q: FiltroRegistrosDto, localId: number | null) {
    const filtros = parametros(q, localId);
    const [items, [{ total }]] = await Promise.all([
      this.bd.consultar<CasoRow>(
        `${SELECT_CASO} ${DONDE}
         ${ordenarPor(q, ORDEN, 'x.fecha desc, x.id desc', 'x.id')}
         limit $5 offset $6`,
        [...filtros, q.limite, q.desde],
      ),
      this.bd.consultar<{ total: number }>(
        `select count(*)::int as total
         from caso_excepcional x
         join conductor d on d.id = x.conductor_id ${DONDE}`,
        filtros,
      ),
    ]);
    return { items, total };
  }

  todos(q: FiltroRegistrosDto, localId: number | null, maximo: number) {
    return this.bd.consultar<CasoRow>(
      `${SELECT_CASO} ${DONDE}
       order by x.fecha desc, x.id desc limit ${maximo}`,
      parametros(q, localId),
    );
  }

  // `localId` null: de cualquier local.
  async porId(
    id: number,
    localId: number | null,
  ): Promise<CasoRow | undefined> {
    const [caso] = await this.bd.consultar<CasoRow>(
      `${SELECT_CASO} where x.id = $1 and ($2::int is null or x.local_id = $2)`,
      [id, localId],
    );
    return caso;
  }

  async insertar(dto: CasoDto): Promise<number> {
    const [{ id }] = await this.bd.consultar<{ id: number }>(
      `insert into caso_excepcional (local_id, conductor_id, fecha, descripcion)
       values ($1, $2, $3, $4) returning id`,
      [dto.localId, dto.conductorId, dto.fecha, dto.descripcion],
    );
    return id;
  }

  async actualizar(id: number, dto: CasoDto) {
    await this.bd.consultar(
      `update caso_excepcional
       set local_id = $2, conductor_id = $3, fecha = $4, descripcion = $5
       where id = $1`,
      [id, dto.localId, dto.conductorId, dto.fecha, dto.descripcion],
    );
  }

  async eliminar(id: number): Promise<boolean> {
    const borrados = await this.bd.consultar(
      'delete from caso_excepcional where id = $1 returning id',
      [id],
    );
    return borrados.length > 0;
  }
}
