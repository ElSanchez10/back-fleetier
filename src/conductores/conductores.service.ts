import { Injectable, NotFoundException } from '@nestjs/common';
import type { UsuarioSesion } from '../auth/sesion.js';
import type {
  ConductorDto,
  FiltroConductoresDto,
  RangoDto,
} from './conductor.dto.js';
import {
  type Conductor,
  ConductoresRepositorio,
} from './conductores.repositorio.js';

// Conductores que hacen las rutas. Son de una ciudad, no de un local: una
// cuenta con local ve los de la ciudad de su local; un admin o asistente, todos.
@Injectable()
export class ConductoresService {
  constructor(private readonly datos: ConductoresRepositorio) {}

  // Además del tramo pedido, el resumen de todos los que la cuenta puede ver
  // (sin los filtros).
  async listar(q: FiltroConductoresDto, usuario: UsuarioSesion) {
    const [{ items, total }, resumen] = await Promise.all([
      this.datos.listar(q, usuario.localId),
      this.datos.resumen(usuario.localId),
    ]);
    return { items, total, resumen };
  }

  todos(q: FiltroConductoresDto, usuario: UsuarioSesion, maximo: number) {
    return this.datos.todos(q, usuario.localId, maximo);
  }

  // Un conductor de otra ciudad se trata igual que uno que no existe.
  async buscar(id: number, usuario: UsuarioSesion): Promise<Conductor> {
    const conductor = await this.datos.porId(id, usuario.localId);
    if (!conductor) {
      throw new NotFoundException({
        statusCode: 404,
        codigo: 'conductor_no_existe',
      });
    }
    return conductor;
  }

  async crear(dto: ConductorDto, usuario: UsuarioSesion) {
    return this.buscar(await this.datos.insertar(dto), usuario);
  }

  async editar(id: number, dto: ConductorDto, usuario: UsuarioSesion) {
    await this.buscar(id, usuario);
    await this.datos.actualizar(id, dto);
    return this.buscar(id, usuario);
  }

  // Sus rutas en un rango de días (las muestra su calendario).
  async rutas(id: number, rango: RangoDto, usuario: UsuarioSesion) {
    await this.buscar(id, usuario);
    return this.datos.rutas(id, rango);
  }

  // Órdenes y rutas por local en el rango; `ordenes` es el total.
  async actividad(id: number, rango: RangoDto, usuario: UsuarioSesion) {
    await this.buscar(id, usuario);
    const locales = await this.datos.actividadPorLocal(id, rango);
    return {
      locales,
      ordenes: locales.reduce((suma, l) => suma + l.ordenes, 0),
    };
  }
}
