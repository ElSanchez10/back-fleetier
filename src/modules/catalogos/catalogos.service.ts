import { NotFoundException } from '@nestjs/common';
import type { QueryResultRow } from 'pg';
import type { UsuarioSesion } from '@/common/interfaces/usuario-sesion.interface';
import type { LocalDto } from './dto/local.request.dto';
import type { LocalResponseDto } from './dto/local.response.dto';
import type { LocalRow } from './interfaces/catalogos-row.interface';
import type { CatalogoRepository } from './repositories/catalogo.repository';

// Cómo se pide a Nest el servicio de cada catálogo: @Inject(CATALOGO.ciudades).
export const CATALOGO = {
  ciudades: 'CatalogoCiudades',
  locales: 'CatalogoLocales',
  destinos: 'CatalogoDestinos',
  tiposCooler: 'CatalogoTiposCooler',
  tiposConductor: 'CatalogoTiposConductor',
  tiposEvento: 'CatalogoTiposEvento',
} as const;

function noExiste(): never {
  throw new NotFoundException({ codigo: 'catalogo_item_no_existe' });
}

// Las cuatro operaciones de un catálogo. Los catálogos son listas cortas: se
// devuelven completas, sin tramos. Solo se elimina lo que nada usa.
//   T: lo que llega (request)   R: la fila   O: lo que se responde
// Hay uno por catálogo; los arma la fábrica de CatalogosModule.
export class CatalogoService<T extends object, R extends QueryResultRow, O> {
  constructor(
    protected readonly datos: CatalogoRepository<T, R>,
    protected readonly aRespuesta: (fila: R) => O,
  ) {}

  async listar(): Promise<O[]> {
    return (await this.datos.listar()).map(this.aRespuesta);
  }

  async crear(dto: T): Promise<O> {
    return this.uno(await this.datos.insertar(dto));
  }

  async editar(id: number, dto: T): Promise<O> {
    if (!(await this.datos.actualizar(id, dto))) {
      noExiste();
    }
    return this.uno(id);
  }

  async eliminar(id: number): Promise<void> {
    if (!(await this.datos.eliminar(id))) {
      noExiste();
    }
  }

  private async uno(id: number): Promise<O> {
    return this.aRespuesta((await this.datos.uno(id)) ?? noExiste());
  }
}

// Los locales: una cuenta con local solo recibe el suyo, que es el único que
// puede elegir en los formularios.
export class LocalesService extends CatalogoService<
  LocalDto,
  LocalRow,
  LocalResponseDto
> {
  async listarPara(usuario: UsuarioSesion): Promise<LocalResponseDto[]> {
    if (!usuario.localId) {
      return this.listar();
    }
    const propio = await this.datos.uno(usuario.localId);
    return propio ? [this.aRespuesta(propio)] : [];
  }
}
