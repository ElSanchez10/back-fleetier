import { Injectable, NotFoundException } from '@nestjs/common';
import type { UsuarioSesion } from '../auth/sesion.js';
import type { ProblemaDto } from './ruta.dto.js';
import { RutasConsultasRepositorio } from './rutas-consultas.repositorio.js';
import { RutasService } from './rutas.service.js';

function noExiste(): never {
  throw new NotFoundException({
    statusCode: 404,
    codigo: 'problema_no_existe',
  });
}

// Problemas de una ruta (pedidos que no se entregaron, etc.). Solo en rutas
// que la cuenta ve.
@Injectable()
export class ProblemasService {
  constructor(
    private readonly datos: RutasConsultasRepositorio,
    private readonly rutas: RutasService,
  ) {}

  async crear(rutaId: number, dto: ProblemaDto, usuario: UsuarioSesion) {
    await this.rutas.buscar(rutaId, usuario);
    return this.datos.insertarProblema(rutaId, dto);
  }

  async editar(
    rutaId: number,
    problemaId: number,
    dto: ProblemaDto,
    usuario: UsuarioSesion,
  ) {
    await this.rutas.buscar(rutaId, usuario);
    return (
      (await this.datos.actualizarProblema(rutaId, problemaId, dto)) ??
      noExiste()
    );
  }

  async eliminar(rutaId: number, problemaId: number, usuario: UsuarioSesion) {
    await this.rutas.buscar(rutaId, usuario);
    if (!(await this.datos.eliminarProblema(rutaId, problemaId))) {
      noExiste();
    }
  }
}
