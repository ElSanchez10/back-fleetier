import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  DatabaseService,
  type Consultar,
} from '@/common/database/database.service';
import type { UsuarioSesion } from '@/common/interfaces/usuario-sesion.interface';
import { exigirLocal, localVisible } from '@/common/utils/alcance.util';
import { noExiste, vePrecios } from '../utils/registros.util';
import type { FiltroPedidosDto } from './dto/filtro-pedidos.query.dto';
import type { PedidoEspecialDto } from './dto/pedido-especial.request.dto';
import { PedidosRepository } from './repositories/pedidos.repository';

import type { Pagina } from '@/common/dto/pagina.response.dto';
import { PedidoEspecialResponseDto } from './dto/pedido-especial.response.dto';
// Pedidos que los locales envían a destinos especiales. Los cuatro roles los
// ven, anotan y corrigen; solo admin los elimina. Encargado y coordinador no
// ven ni fijan precios, no marcan extraordinarios, no corrigen los ya marcados
// ni agregan destinos.
@Injectable()
export class PedidosService {
  constructor(
    private readonly bd: DatabaseService,
    private readonly datos: PedidosRepository,
  ) {}

  async listar(
    q: FiltroPedidosDto,
    usuario: UsuarioSesion,
  ): Promise<Pagina<PedidoEspecialResponseDto>> {
    const { items, total } = await this.datos.listar(
      q,
      localVisible(usuario, q.localId),
      vePrecios(usuario.rol),
    );
    return { items: items.map(PedidoEspecialResponseDto.fromRow), total };
  }

  async todos(
    q: FiltroPedidosDto,
    usuario: UsuarioSesion,
    maximo: number,
  ): Promise<PedidoEspecialResponseDto[]> {
    const filas = await this.datos.todos(
      q,
      localVisible(usuario, q.localId),
      vePrecios(usuario.rol),
      maximo,
    );
    return filas.map(PedidoEspecialResponseDto.fromRow);
  }

  // Un pedido de otro local se trata igual que uno que no existe.
  async buscar(
    id: number,
    usuario: UsuarioSesion,
  ): Promise<PedidoEspecialResponseDto> {
    return PedidoEspecialResponseDto.fromRow(
      (await this.datos.porId(id, usuario.localId, vePrecios(usuario.rol))) ??
        noExiste('pedido_no_existe'),
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
        codigo: 'destino_nuevo_no_permitido',
      });
    }
    return this.datos.insertarDestino(sql, dto.otroDestino, dto.precio ?? 0);
  }
}
