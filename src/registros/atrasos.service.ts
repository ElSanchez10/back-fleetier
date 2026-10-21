import { Injectable } from '@nestjs/common';
import type { UsuarioSesion } from '../auth/sesion.js';
import { exigirLocal, localVisible } from '../comun/alcance.js';
import { type Atraso, AtrasosRepositorio } from './atrasos.repositorio.js';
import type { AtrasoDto, FiltroAtrasosDto } from './registro.dto.js';
import { noExiste } from './registros.js';

// Órdenes que un local dejó atrasadas en un día. Una cuenta con local solo ve
// y anota los de su local.
@Injectable()
export class AtrasosService {
  constructor(private readonly datos: AtrasosRepositorio) {}

  listar(q: FiltroAtrasosDto, usuario: UsuarioSesion) {
    return this.datos.listar(q, localVisible(usuario, q.localId));
  }

  todos(q: FiltroAtrasosDto, usuario: UsuarioSesion, maximo: number) {
    return this.datos.todos(q, localVisible(usuario, q.localId), maximo);
  }

  // Uno de otro local se trata igual que uno que no existe.
  async buscar(id: number, usuario: UsuarioSesion): Promise<Atraso> {
    return (
      (await this.datos.porId(id, usuario.localId)) ??
      noExiste('atraso_no_existe')
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
