import { Injectable, NotFoundException } from '@nestjs/common';
import type { UsuarioSesion } from '@/common/interfaces/usuario-sesion.interface';
import type { ConductorDto } from './dto/conductor.request.dto';
import type { FiltroConductoresDto } from './dto/filtro-conductores.query.dto';
import type { RangoDto } from './dto/rango.query.dto';
import { ConductoresRepository } from './repositories/conductores.repository';

import { ConductorResponseDto } from './dto/conductor.response.dto';
import {
  ListadoConductoresResponseDto,
  ResumenConductoresDto,
} from './dto/listado-conductores.response.dto';
import {
  ActividadConductorResponseDto,
  ActividadEnLocalDto,
  RutaDeConductorResponseDto,
} from './dto/ruta-de-conductor.response.dto';
// Conductores que hacen las rutas. Son de una ciudad, no de un local: una
// cuenta con local ve los de la ciudad de su local; un admin o asistente, todos.
@Injectable()
export class ConductoresService {
  constructor(private readonly datos: ConductoresRepository) {}

  // Además del tramo pedido, el resumen de todos los que la cuenta puede ver
  // (sin los filtros).
  async listar(
    q: FiltroConductoresDto,
    usuario: UsuarioSesion,
  ): Promise<ListadoConductoresResponseDto> {
    const [{ items, total }, resumen] = await Promise.all([
      this.datos.listar(q, usuario.localId),
      this.datos.resumen(usuario.localId),
    ]);
    return {
      items: items.map(ConductorResponseDto.fromRow),
      total,
      resumen: ResumenConductoresDto.fromRow(resumen),
    };
  }

  async todos(
    q: FiltroConductoresDto,
    usuario: UsuarioSesion,
    maximo: number,
  ): Promise<ConductorResponseDto[]> {
    const filas = await this.datos.todos(q, usuario.localId, maximo);
    return filas.map(ConductorResponseDto.fromRow);
  }

  // Un conductor de otra ciudad se trata igual que uno que no existe.
  async buscar(
    id: number,
    usuario: UsuarioSesion,
  ): Promise<ConductorResponseDto> {
    const conductor = await this.datos.porId(id, usuario.localId);
    if (!conductor) {
      throw new NotFoundException({ codigo: 'conductor_no_existe' });
    }
    return ConductorResponseDto.fromRow(conductor);
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
  async rutas(
    id: number,
    rango: RangoDto,
    usuario: UsuarioSesion,
  ): Promise<RutaDeConductorResponseDto[]> {
    await this.buscar(id, usuario);
    const filas = await this.datos.rutas(id, rango);
    return filas.map(RutaDeConductorResponseDto.fromRow);
  }

  // Órdenes y rutas por local en el rango; `ordenes` es el total.
  async actividad(
    id: number,
    rango: RangoDto,
    usuario: UsuarioSesion,
  ): Promise<ActividadConductorResponseDto> {
    await this.buscar(id, usuario);
    const locales = (await this.datos.actividadPorLocal(id, rango)).map(
      ActividadEnLocalDto.fromRow,
    );
    return {
      locales,
      ordenes: locales.reduce((suma, l) => suma + l.ordenes, 0),
    };
  }
}
