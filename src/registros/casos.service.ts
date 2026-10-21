import { Injectable } from '@nestjs/common';
import type { UsuarioSesion } from '../auth/sesion.js';
import { exigirLocal, localVisible } from '../comun/alcance.js';
import { ConductoresService } from '../conductores/conductores.service.js';
import { type Caso, CasosRepositorio } from './casos.repositorio.js';
import type { CasoDto, FiltroRegistrosDto } from './registro.dto.js';
import { noExiste } from './registros.js';

// Casos excepcionales de un conductor en un local. Una cuenta con local solo
// ve y anota los de su local, con conductores de su ciudad.
@Injectable()
export class CasosService {
  constructor(
    private readonly datos: CasosRepositorio,
    private readonly conductores: ConductoresService,
  ) {}

  listar(q: FiltroRegistrosDto, usuario: UsuarioSesion) {
    return this.datos.listar(q, localVisible(usuario, q.localId));
  }

  todos(q: FiltroRegistrosDto, usuario: UsuarioSesion, maximo: number) {
    return this.datos.todos(q, localVisible(usuario, q.localId), maximo);
  }

  // Uno de otro local se trata igual que uno que no existe.
  async buscar(id: number, usuario: UsuarioSesion): Promise<Caso> {
    return (
      (await this.datos.porId(id, usuario.localId)) ??
      noExiste('caso_no_existe')
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
