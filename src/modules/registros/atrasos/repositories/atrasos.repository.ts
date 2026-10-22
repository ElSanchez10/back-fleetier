import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@/common/database/database.service';
import { ordenarPor } from '@/common/database/sql.util';
import { DONDE_COMUN, filtrosComunes } from '../../repositories/registros.sql';
import type { AtrasoDto } from '../dto/atraso.request.dto';
import type { FiltroAtrasosDto } from '../dto/filtro-atrasos.query.dto';
import type { AtrasoRow } from '../interfaces/atraso-row.interface';

// Acceso a los datos de los atrasos, para AtrasosService.

const SELECT_ATRASO = `
  select x.id, x.fecha, x.local_id, l.nombre as local, c.nombre as ciudad,
         x.tipo, x.cantidad
  from atraso x
  join local l on l.id = x.local_id
  join ciudad c on c.id = l.ciudad_id`;

// Tras los comunes: $4 tipo.
const DONDE = `
  where ${DONDE_COMUN}
    and ($4::tipo_atraso is null or x.tipo = $4)`;

// Columnas por las que se ordena el listado.
const ORDEN = {
  id: 'x.id',
  fecha: 'x.fecha',
  local: 'lower(l.nombre)',
  tipo: 'x.tipo',
  cantidad: 'x.cantidad',
};

// $1..$4 de DONDE.
const parametros = (q: FiltroAtrasosDto, localId: number | null) => [
  ...filtrosComunes(q, localId),
  q.tipo ?? null,
];

@Injectable()
export class AtrasosRepository {
  constructor(private readonly bd: DatabaseService) {}

  async listar(q: FiltroAtrasosDto, localId: number | null) {
    const filtros = parametros(q, localId);
    const [items, [{ total }]] = await Promise.all([
      this.bd.consultar<AtrasoRow>(
        `${SELECT_ATRASO} ${DONDE}
         ${ordenarPor(q, ORDEN, 'x.fecha desc, x.id desc', 'x.id')}
         limit $5 offset $6`,
        [...filtros, q.limite, q.desde],
      ),
      this.bd.consultar<{ total: number }>(
        `select count(*)::int as total from atraso x ${DONDE}`,
        filtros,
      ),
    ]);
    return { items, total };
  }

  todos(q: FiltroAtrasosDto, localId: number | null, maximo: number) {
    return this.bd.consultar<AtrasoRow>(
      `${SELECT_ATRASO} ${DONDE}
       order by x.fecha desc, x.id desc limit ${maximo}`,
      parametros(q, localId),
    );
  }

  // `localId` null: de cualquier local.
  async porId(
    id: number,
    localId: number | null,
  ): Promise<AtrasoRow | undefined> {
    const [atraso] = await this.bd.consultar<AtrasoRow>(
      `${SELECT_ATRASO} where x.id = $1 and ($2::int is null or x.local_id = $2)`,
      [id, localId],
    );
    return atraso;
  }

  async insertar(dto: AtrasoDto): Promise<number> {
    const [{ id }] = await this.bd.consultar<{ id: number }>(
      `insert into atraso (local_id, tipo, fecha, cantidad)
       values ($1, $2, $3, $4) returning id`,
      [dto.localId, dto.tipo, dto.fecha, dto.cantidad],
    );
    return id;
  }

  async actualizar(id: number, dto: AtrasoDto) {
    await this.bd.consultar(
      `update atraso set local_id = $2, tipo = $3, fecha = $4, cantidad = $5
       where id = $1`,
      [id, dto.localId, dto.tipo, dto.fecha, dto.cantidad],
    );
  }

  async eliminar(id: number): Promise<boolean> {
    const borrados = await this.bd.consultar(
      'delete from atraso where id = $1 returning id',
      [id],
    );
    return borrados.length > 0;
  }
}
