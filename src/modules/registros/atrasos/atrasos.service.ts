import { Injectable } from '@nestjs/common';
import type { UsuarioSesion } from '@/common/interfaces/usuario-sesion.interface';
import { exigirLocal, localVisible } from '@/common/utils/alcance.util';
import { noExiste } from '../utils/registros.util';
import type { AtrasoDto } from './dto/atraso.request.dto';
import type { FiltroAtrasosDto } from './dto/filtro-atrasos.query.dto';
import { AtrasosRepository } from './repositories/atrasos.repository';

import type { Pagina } from '@/common/dto/pagina.response.dto';
import { AtrasoResponseDto } from './dto/atraso.response.dto';
// Órdenes que un local dejó atrasadas en un día. Una cuenta con local solo ve
// y anota los de su local.
@Injectable()
export class AtrasosService {
  constructor(private readonly datos: AtrasosRepository) {}

  async listar(
    q: FiltroAtrasosDto,
    usuario: UsuarioSesion,
  ): Promise<Pagina<AtrasoResponseDto>> {
    const { items, total } = await this.datos.listar(
      q,
      localVisible(usuario, q.localId),
    );
    return { items: items.map(AtrasoResponseDto.fromRow), total };
  }

  async todos(
    q: FiltroAtrasosDto,
    usuario: UsuarioSesion,
    maximo: number,
  ): Promise<AtrasoResponseDto[]> {
    const filas = await this.datos.todos(
      q,
      localVisible(usuario, q.localId),
      maximo,
    );
    return filas.map(AtrasoResponseDto.fromRow);
  }

  // Uno de otro local se trata igual que uno que no existe.
  async buscar(id: number, usuario: UsuarioSesion): Promise<AtrasoResponseDto> {
    return AtrasoResponseDto.fromRow(
      (await this.datos.porId(id, usuario.localId)) ??
        noExiste('atraso_no_existe'),
    );
  }

  async crear(dto: AtrasoDto, usuario: UsuarioSesion) {
    exigirLocal(usuario, dto.localId);
    return this.buscar(await this.datos.insertar(dto), usuario);
  }

  async editar(id: number, dto: AtrasoDto, usuario: UsuarioSesion) {
    await this.buscar(id, usuario);
    exigirLocal(usuario, dto.localId);
    await this.datos.actualizar(id, dto);
    return this.buscar(id, usuario);
  }

  async eliminar(id: number) {
    if (!(await this.datos.eliminar(id))) {
      noExiste('atraso_no_existe');
    }
  }
}
