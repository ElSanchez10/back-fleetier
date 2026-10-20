import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  Roles,
  TODOS_LOS_ROLES,
  UsuarioActual,
  type UsuarioSesion,
} from '../auth/sesion.js';
import { BdService, type Consultar } from '../bd/bd.service.js';
import { exigirLocal, localVisible } from '../comun/alcance.js';
import { IdPipe } from '../comun/id.pipe.js';
import {
  type Columna,
  excel,
  EXPORTAN,
  MAX_FILAS_EXCEL,
} from '../comun/excel.js';
import { Pagina } from '../comun/paginacion.js';
import { contiene, ordenarPor, patron } from '../comun/sql.js';
import { FiltroPedidosDto, PedidoEspecialDto } from './registro.dto.js';
import {
  DONDE_COMUN,
  filtrosComunes,
  noExiste,
  vePrecios,
} from './registros.js';

export interface PedidoEspecial {
  id: number;
  fecha: string;
  localId: number;
  local: string;
  ciudad: string;
  destinoId: number;
  destino: string;
  cantidad: number;
  // null para quien no ve los precios.
  precio: number | null;
  extraordinario: boolean;
  descripcion: string;
}

// `vePrecios`: el parámetro ($n) que dice si la cuenta ve los precios.
const selectPedido = (vePrecios: string) => `
  select x.id, x.fecha, x.local_id as "localId", l.nombre as local, c.nombre as ciudad,
         x.destino_id as "destinoId", d.nombre as destino, x.cantidad,
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

// Pedidos que los locales envían a destinos especiales. Los cuatro roles los
// ven, anotan y corrigen; solo admin los elimina. Encargado y coordinador no
// ven precios, no marcan extraordinarios ni corrigen los ya marcados.
@Controller('pedidos-especiales')
@Roles(...TODOS_LOS_ROLES)
export class PedidosController {
  constructor(private readonly bd: BdService) {}

  @Get()
  async listar(
    @Query() q: FiltroPedidosDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<Pagina<PedidoEspecial>> {
    const filtros = this.filtros(q, usuario);
    const [items, [{ total }]] = await Promise.all([
      this.bd.consultar<PedidoEspecial>(
        `${selectPedido('$6')} ${DONDE}
         ${ordenarPor(q, vePrecios(usuario.rol) ? ORDEN_CON_VALOR : ORDEN, 'x.fecha desc, x.id desc', 'x.id')}
         limit $7 offset $8`,
        [...filtros, vePrecios(usuario.rol), q.limite, q.desde],
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

  // Planilla con los pedidos que cumplen el filtro; el valor, solo para quien lo ve.
  @Get('excel')
  @Roles(...EXPORTAN)
  async excel(
    @Query() q: FiltroPedidosDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    const vePrecio = vePrecios(usuario.rol);
    const pedidos = await this.bd.consultar<PedidoEspecial>(
      `${selectPedido('$6')} ${DONDE}
       order by x.fecha desc, x.id desc limit ${MAX_FILAS_EXCEL}`,
      [...this.filtros(q, usuario), vePrecio],
    );
    // Las mismas columnas que la planilla de la versión Laravel.
    const columnas: Columna<PedidoEspecial>[] = [
      { titulo: 'Identificador', valor: (p) => p.id },
      { titulo: 'Fecha', valor: (p) => p.fecha, tipo: 'fecha' },
      { titulo: 'Local', valor: (p) => p.local },
      { titulo: 'Ciudad', valor: (p) => p.ciudad },
      { titulo: 'Destino', valor: (p) => p.destino },
      {
        titulo: 'Extraordinario (1:sí)',
        valor: (p) => (p.extraordinario ? 1 : 0),
      },
      { titulo: 'Descripción', valor: (p) => p.descripcion },
      { titulo: 'Cantidad OP', valor: (p) => p.cantidad, tipo: 'numero' },
    ];
    if (vePrecio) {
      columnas.push({
        titulo: 'Precio',
        valor: (p) => p.precio,
        tipo: 'pesos',
      });
    }
    return excel(
      'Historial Pedidos Especiales',
      'Especiales',
      columnas,
      pedidos,
    );
  }

  @Post()
  async crear(
    @Body() dto: PedidoEspecialDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    exigirLocal(usuario, dto.localId);
    const propio = vePrecios(usuario.rol);
    const id = await this.bd.transaccion(async (consultar) => {
      const destinoId = await this.destino(consultar, dto, usuario);
      const [pedido] = await consultar<{ id: number }>(
        `insert into pedido_especial
           (local_id, destino_id, fecha, cantidad, precio, extraordinario, descripcion)
         select $1, d.id, $3, $4, coalesce($5, d.precio_base), $6, $7
         from destino_pedido_especial d where d.id = $2
         returning id`,
        [
          dto.localId,
          destinoId,
          dto.fecha,
          dto.cantidad,
          propio ? dto.precio : null,
          propio ? (dto.extraordinario ?? false) : false,
          dto.descripcion,
        ],
      );
      return pedido?.id ?? noExiste('destino_no_existe');
    });
    return this.buscar(id, usuario);
  }

  // Si no se fija el precio, se mantiene el que tenía; si cambia de destino,
  // pasa a ser el precio base del destino nuevo.
  @Put(':id')
  async editar(
    @Param('id', IdPipe) id: number,
    @Body() dto: PedidoEspecialDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    const actual = await this.buscar(id, usuario);
    const propio = vePrecios(usuario.rol);
    if (actual.extraordinario && !propio) {
      throw new ForbiddenException({
        statusCode: 403,
        codigo: 'pedido_extraordinario',
      });
    }
    exigirLocal(usuario, dto.localId);
    await this.bd.transaccion(async (consultar) => {
      const destinoId = await this.destino(consultar, dto, usuario);
      const editados = await consultar(
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
          dto.localId,
          destinoId,
          dto.fecha,
          dto.cantidad,
          propio ? dto.precio : null,
          propio ? dto.extraordinario : null,
          dto.descripcion,
        ],
      );
      if (editados.length === 0) {
        noExiste('destino_no_existe');
      }
    });
    return this.buscar(id, usuario);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(204)
  async eliminar(@Param('id', IdPipe) id: number) {
    const borrados = await this.bd.consultar(
      'delete from pedido_especial where id = $1 returning id',
      [id],
    );
    if (borrados.length === 0) {
      noExiste('pedido_no_existe');
    }
  }

  // $1..$5 de DONDE.
  private filtros(q: FiltroPedidosDto, usuario: UsuarioSesion) {
    return [
      ...filtrosComunes(q, localVisible(usuario, q.localId)),
      patron(q.buscar),
      q.extraordinario ?? null,
    ];
  }

  // Un pedido de otro local se trata igual que uno que no existe.
  private async buscar(id: number, usuario: UsuarioSesion) {
    const [pedido] = await this.bd.consultar<PedidoEspecial>(
      `${selectPedido('$1')} where x.id = $2 and ($3::int is null or x.local_id = $3)`,
      [vePrecios(usuario.rol), id, usuario.localId],
    );
    return pedido ?? noExiste('pedido_no_existe');
  }

  // El destino elegido, o el nuevo que se escribió (lo agrega a la lista).
  private async destino(
    consultar: Consultar,
    dto: PedidoEspecialDto,
    usuario: UsuarioSesion,
  ): Promise<number | null> {
    if (!dto.otroDestino) {
      return dto.destinoId;
    }
    if (!vePrecios(usuario.rol)) {
      throw new ForbiddenException({
        statusCode: 403,
        codigo: 'destino_nuevo_no_permitido',
      });
    }
    const [{ id }] = await consultar<{ id: number }>(
      `insert into destino_pedido_especial (nombre, precio_base)
       values ($1, $2) returning id`,
      [dto.otroDestino, dto.precio ?? 0],
    );
    return id;
  }
}
