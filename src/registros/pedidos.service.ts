import { ForbiddenException, Injectable } from '@nestjs/common';
import type { UsuarioSesion } from '../auth/sesion.js';
import { BdService, type Consultar } from '../bd/bd.service.js';
import { exigirLocal, localVisible } from '../comun/alcance.js';
import type { FiltroPedidosDto, PedidoEspecialDto } from './registro.dto.js';
import {
  type PedidoEspecial,
  PedidosRepositorio,
} from './pedidos.repositorio.js';
import { noExiste, vePrecios } from './registros.js';

// Pedidos que los locales envían a destinos especiales. Los cuatro roles los
// ven, anotan y corrigen; solo admin los elimina. Encargado y coordinador no
// ven ni fijan precios, no marcan extraordinarios, no corrigen los ya marcados
// ni agregan destinos.
@Injectable()
export class PedidosService {
  constructor(
    private readonly bd: BdService,
    private readonly datos: PedidosRepositorio,
  ) {}

  listar(q: FiltroPedidosDto, usuario: UsuarioSesion) {
    return this.datos.listar(
      q,
      localVisible(usuario, q.localId),
      vePrecios(usuario.rol),
    );
  }

  todos(q: FiltroPedidosDto, usuario: UsuarioSesion, maximo: number) {
    return this.datos.todos(
      q,
      localVisible(usuario, q.localId),
      vePrecios(usuario.rol),
      maximo,
    );
  }

  // Un pedido de otro local se trata igual que uno que no existe.
  async buscar(id: number, usuario: UsuarioSesion): Promise<PedidoEspecial> {
    return (
      (await this.datos.porId(id, usuario.localId, vePrecios(usuario.rol))) ??
      noExiste('pedido_no_existe')
    );
  }

  // Sin precio, queda el precio base del destino.
  async crear(dto: PedidoEspecialDto, usuario: UsuarioSesion) {
    exigirLocal(usuario, dto.localId);
    const propio = vePrecios(usuario.rol);
    const id = await this.bd.transaccion(async (sql) => {
      const destinoId = await this.destino(sql, dto, usuario);
      return this.datos.insertar(sql, {
        localId: dto.localId,
        destinoId,
        fecha: dto.fecha,
        cantidad: dto.cantidad,
        precio: propio ? (dto.precio ?? null) : null,
        extraordinario: propio ? (dto.extraordinario ?? false) : false,
        descripcion: dto.descripcion,
      });
    });
    return this.buscar(id ?? noExiste('destino_no_existe'), usuario);
  }

  // Sin precio, se mantiene el que tenía; si cambia de destino, pasa a ser el
  // precio base del destino nuevo.
  async editar(id: number, dto: PedidoEspecialDto, usuario: UsuarioSesion) {
    const actual = await this.buscar(id, usuario);
    const propio = vePrecios(usuario.rol);
    if (actual.extraordinario && !propio) {
      throw new ForbiddenException({
        statusCode: 403,
        codigo: 'pedido_extraordinario',
      });
    }
    exigirLocal(usuario, dto.localId);
    await this.bd.transaccion(async (sql) => {
      const destinoId = await this.destino(sql, dto, usuario);
      const editado = await this.datos.actualizar(sql, id, {
        localId: dto.localId,
        destinoId,
        fecha: dto.fecha,
        cantidad: dto.cantidad,
        precio: propio ? (dto.precio ?? null) : null,
        extraordinario: propio ? (dto.extraordinario ?? null) : null,
        descripcion: dto.descripcion,
      });
      if (!editado) {
        noExiste('destino_no_existe');
      }
    });
    return this.buscar(id, usuario);
  }

  async eliminar(id: number) {
    if (!(await this.datos.eliminar(id))) {
      noExiste('pedido_no_existe');
    }
  }

  // El destino elegido, o el nuevo que se escribió (lo agrega a la lista,
  // con el precio del pedido como precio base).
  private async destino(
    sql: Consultar,
    dto: PedidoEspecialDto,
    usuario: UsuarioSesion,
  ): Promise<number> {
    if (!dto.otroDestino) {
      return dto.destinoId ?? noExiste('destino_no_existe');
    }
    if (!vePrecios(usuario.rol)) {
      throw new ForbiddenException({
        statusCode: 403,
        codigo: 'destino_nuevo_no_permitido',
      });
    }
    return this.datos.insertarDestino(sql, dto.otroDestino, dto.precio ?? 0);
  }
}
