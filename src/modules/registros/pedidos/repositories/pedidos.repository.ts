import { Injectable } from '@nestjs/common';
import {
  DatabaseService,
  type Consultar,
} from '@/common/database/database.service';
import { contiene, ordenarPor, patron } from '@/common/database/sql.util';
import { DONDE_COMUN, filtrosComunes } from '../../repositories/registros.sql';
import type { FiltroPedidosDto } from '../dto/filtro-pedidos.query.dto';
import type { PedidoEspecialRow } from '../interfaces/pedido-especial-row.interface';

// Acceso a los datos de los pedidos especiales, para PedidosService. Aquí no
// se decide nada: solo se lee y se escribe.

export interface DatosPedido {
  localId: number;
  destinoId: number;
  fecha: string;
  cantidad: number;
  // null: el precio base del destino (al crear) o el que tenía (al corregir).
  precio: number | null;
  // null al corregir: el que tenía.
  extraordinario: boolean | null;
  descripcion: string;
}

// `vePrecios`: el parámetro ($n) que dice si la cuenta ve los precios.
const selectPedido = (vePrecios: string) => `
  select x.id, x.fecha, x.local_id, l.nombre as local, c.nombre as ciudad,
         x.destino_id, d.nombre as destino, x.cantidad,
         case when ${vePrecios}::boolean then x.precio end as precio,
         x.extraordinario, x.descripcion
  from pedido_especial x
  join local l on l.id = x.local_id
  join ciudad c on c.id = l.ciudad_id
  join destino_pedido_especial d on d.id = x.destino_id`;

// Tras los comunes: $4 texto (destino o descripción), $5 extraordinario.
const DONDE = `
  where ${DONDE_COMUN}
    and (${contiene('d.nombre', '$4')} or ${contiene('x.descripcion', '$4')})
    and ($5::boolean is null or x.extraordinario = $5)`;

// Columnas por las que se ordena el listado. El valor, solo para quien lo ve.
const ORDEN = {
  id: 'x.id',
  fecha: 'x.fecha',
  local: 'lower(l.nombre)',
  destino: 'lower(d.nombre)',
  cantidad: 'x.cantidad',
};
const ORDEN_CON_VALOR = { ...ORDEN, valor: 'x.precio' };

// $1..$5 de DONDE.
const parametros = (q: FiltroPedidosDto, localId: number | null) => [
  ...filtrosComunes(q, localId),
  patron(q.buscar),
  q.extraordinario ?? null,
];

@Injectable()
export class PedidosRepository {
  constructor(private readonly bd: DatabaseService) {}

  async listar(
    q: FiltroPedidosDto,
    localId: number | null,
    vePrecios: boolean,
  ) {
    const filtros = parametros(q, localId);
    const [items, [{ total }]] = await Promise.all([
      this.bd.consultar<PedidoEspecialRow>(
        `${selectPedido('$6')} ${DONDE}
         ${ordenarPor(q, vePrecios ? ORDEN_CON_VALOR : ORDEN, 'x.fecha desc, x.id desc', 'x.id')}
         limit $7 offset $8`,
        [...filtros, vePrecios, q.limite, q.desde],
      ),
      this.bd.consultar<{ total: number }>(
        `select count(*)::int as total
         from pedido_especial x
         join destino_pedido_especial d on d.id = x.destino_id ${DONDE}`,
        filtros,
      ),
    ]);
    return { items, total };
  }

  todos(
    q: FiltroPedidosDto,
    localId: number | null,
    vePrecios: boolean,
    maximo: number,
  ): Promise<PedidoEspecialRow[]> {
    return this.bd.consultar<PedidoEspecialRow>(
      `${selectPedido('$6')} ${DONDE}
       order by x.fecha desc, x.id desc limit ${maximo}`,
      [...parametros(q, localId), vePrecios],
    );
  }

  // `localId` null: de cualquier local.
  async porId(
    id: number,
    localId: number | null,
    vePrecios: boolean,
  ): Promise<PedidoEspecialRow | undefined> {
    const [pedido] = await this.bd.consultar<PedidoEspecialRow>(
      `${selectPedido('$1')} where x.id = $2 and ($3::int is null or x.local_id = $3)`,
      [vePrecios, id, localId],
    );
    return pedido;
  }

  async insertarDestino(
    sql: Consultar,
    nombre: string,
    precioBase: number,
  ): Promise<number> {
    const [{ id }] = await sql<{ id: number }>(
      `insert into destino_pedido_especial (nombre, precio_base)
       values ($1, $2) returning id`,
      [nombre, precioBase],
    );
    return id;
  }

  // undefined si el destino no existe.
  async insertar(sql: Consultar, p: DatosPedido): Promise<number | undefined> {
    const [pedido] = await sql<{ id: number }>(
      `insert into pedido_especial
         (local_id, destino_id, fecha, cantidad, precio, extraordinario, descripcion)
       select $1, d.id, $3, $4, coalesce($5, d.precio_base), coalesce($6, false), $7
       from destino_pedido_especial d where d.id = $2
       returning id`,
      [
        p.localId,
        p.destinoId,
        p.fecha,
        p.cantidad,
        p.precio,
        p.extraordinario,
        p.descripcion,
      ],
    );
    return pedido?.id;
  }

  // Sin precio, se mantiene el que tenía; si cambia de destino, pasa a ser el
  // precio base del destino nuevo. false si el destino no existe.
  async actualizar(
    sql: Consultar,
    id: number,
    p: DatosPedido,
  ): Promise<boolean> {
    const editados = await sql(
      `update pedido_especial x
       set local_id = $2, destino_id = d.id, fecha = $4, cantidad = $5,
           precio = coalesce($6, case when x.destino_id = d.id then x.precio
                                      else d.precio_base end),
           extraordinario = coalesce($7, x.extraordinario),
           descripcion = $8
       from destino_pedido_especial d
       where x.id = $1 and d.id = $3
       returning x.id`,
      [
        id,
        p.localId,
        p.destinoId,
        p.fecha,
        p.cantidad,
        p.precio,
        p.extraordinario,
        p.descripcion,
      ],
    );
    return editados.length > 0;
  }

  async eliminar(id: number): Promise<boolean> {
    const borrados = await this.bd.consultar(
      'delete from pedido_especial where id = $1 returning id',
      [id],
    );
    return borrados.length > 0;
  }
}
