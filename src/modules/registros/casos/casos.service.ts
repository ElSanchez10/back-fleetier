import { Injectable } from '@nestjs/common';
import type { UsuarioSesion } from '@/common/interfaces/usuario-sesion.interface';
import { exigirLocal, localVisible } from '@/common/utils/alcance.util';
import { ConductoresService } from '@/modules/conductores/conductores.service';
import type { FiltroRegistrosDto } from '../dto/filtro-registros.query.dto';
import { noExiste } from '../utils/registros.util';
import type { CasoDto } from './dto/caso.request.dto';
import { CasosRepository } from './repositories/casos.repository';

import type { Pagina } from '@/common/dto/pagina.response.dto';
import { CasoResponseDto } from './dto/caso.response.dto';
// Casos excepcionales de un conductor en un local. Una cuenta con local solo
// ve y anota los de su local, con conductores de su ciudad.
@Injectable()
export class CasosService {
  constructor(
    private readonly datos: CasosRepository,
    private readonly conductores: ConductoresService,
  ) {}

  async listar(
    q: FiltroRegistrosDto,
    usuario: UsuarioSesion,
  ): Promise<Pagina<CasoResponseDto>> {
    const { items, total } = await this.datos.listar(
      q,
      localVisible(usuario, q.localId),
    );
    return { items: items.map(CasoResponseDto.fromRow), total };
  }

  async todos(
    q: FiltroRegistrosDto,
    usuario: UsuarioSesion,
    maximo: number,
  ): Promise<CasoResponseDto[]> {
    const filas = await this.datos.todos(
      q,
      localVisible(usuario, q.localId),
      maximo,
    );
    return filas.map(CasoResponseDto.fromRow);
  }

  // Uno de otro local se trata igual que uno que no existe.
  async buscar(id: number, usuario: UsuarioSesion): Promise<CasoResponseDto> {
    return CasoResponseDto.fromRow(
      (await this.datos.porId(id, usuario.localId)) ??
        noExiste('caso_no_existe'),
    );
  }

  async crear(dto: CasoDto, usuario: UsuarioSesion) {
    await this.validar(dto, usuario);
    return this.buscar(await this.datos.insertar(dto), usuario);
  }

  async editar(id: number, dto: CasoDto, usuario: UsuarioSesion) {
    const actual = await this.buscar(id, usuario);
    // Se puede dejar el conductor que ya tenía aunque hoy sea de otra ciudad.
    await this.validar(dto, usuario, actual.conductorId);
    await this.datos.actualizar(id, dto);
    return this.buscar(id, usuario);
  }

  async eliminar(id: number) {
    if (!(await this.datos.eliminar(id))) {
      noExiste('caso_no_existe');
    }
  }

  // La cuenta debe poder operar el local y ver al conductor (su ciudad).
  private async validar(
    dto: CasoDto,
    usuario: UsuarioSesion,
    conductorActual?: number,
  ) {
    exigirLocal(usuario, dto.localId);
    if (dto.conductorId !== conductorActual) {
      await this.conductores.buscar(dto.conductorId, usuario);
    }
  }
}
