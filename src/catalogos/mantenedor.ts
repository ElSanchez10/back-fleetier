import { NotFoundException } from '@nestjs/common';
import type { UsuarioSesion } from '../auth/sesion.js';
import type { LocalDto } from './catalogo.dto.js';
import type { CatalogoRepositorio } from './catalogo.repositorio.js';

function noExiste(): never {
  throw new NotFoundException({
    statusCode: 404,
    codigo: 'catalogo_item_no_existe',
  });
}

// Las cuatro operaciones de un catálogo. Los catálogos son listas cortas: se
// devuelven completas, sin tramos. Solo se elimina lo que nada usa.
export class Mantenedor<T extends object> {
  constructor(protected readonly datos: CatalogoRepositorio<T>) {}

  listar() {
    return this.datos.listar();
  }

  async crear(dto: T) {
    return this.datos.uno(await this.datos.insertar(dto));
  }

  async editar(id: number, dto: T) {
    if (!(await this.datos.actualizar(id, dto))) {
      noExiste();
    }
    return this.datos.uno(id);
  }

  async eliminar(id: number) {
    if (!(await this.datos.eliminar(id))) {
      noExiste();
    }
  }
}

// Los locales: una cuenta con local solo recibe el suyo, que es el único que
// puede elegir en los formularios.
export class MantenedorLocales extends Mantenedor<LocalDto> {
  listarPara(usuario: UsuarioSesion) {
    return usuario.localId
      ? this.datos.listar('where c.id = $1', [usuario.localId])
      : this.datos.listar();
  }
}
