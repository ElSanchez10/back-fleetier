import { Injectable, NotFoundException } from '@nestjs/common';
import type { UsuarioSesion } from '../auth/sesion.js';
import type { EventoDto, RangoDto } from './conductor.dto.js';
import { ConductoresService } from './conductores.service.js';
import { type DatosEvento, EventosRepositorio } from './eventos.repositorio.js';

function noExiste(): never {
  throw new NotFoundException({ statusCode: 404, codigo: 'evento_no_existe' });
}

// Lo que se guarda de un evento: con `tipoNuevo`, el tipo se crea junto con
// el evento; si no, se usa el elegido.
export function datosDelEvento(dto: EventoDto): DatosEvento {
  const nuevo = dto.tipoNuevo;
  return {
    titulo: dto.titulo,
    descripcion: dto.descripcion ?? null,
    desde: dto.desde,
    hasta: dto.hasta,
    tipo: {
      id: nuevo ? null : (dto.tipoEventoId ?? null),
      nombre: nuevo?.nombre ?? null,
      color: nuevo?.color ?? null,
    },
  };
}

// Eventos del calendario de un conductor (vacaciones, licencias…). Los ve
// quien puede ver al conductor; quién los anota lo decide el controlador.
@Injectable()
export class EventosService {
  constructor(
    private readonly datos: EventosRepositorio,
    private readonly conductores: ConductoresService,
  ) {}

  async listar(conductorId: number, rango: RangoDto, usuario: UsuarioSesion) {
    await this.conductores.buscar(conductorId, usuario);
    return this.datos.listar(conductorId, rango);
  }

  async crear(conductorId: number, dto: EventoDto, usuario: UsuarioSesion) {
    await this.conductores.buscar(conductorId, usuario);
    const id = await this.datos.insertar(conductorId, datosDelEvento(dto));
    return this.datos.uno(id);
  }

  async editar(
    conductorId: number,
    eventoId: number,
    dto: EventoDto,
    usuario: UsuarioSesion,
  ) {
    await this.conductores.buscar(conductorId, usuario);
    if (
      !(await this.datos.actualizar(conductorId, eventoId, datosDelEvento(dto)))
    ) {
      noExiste();
    }
    return this.datos.uno(eventoId);
  }

  async eliminar(
    conductorId: number,
    eventoId: number,
    usuario: UsuarioSesion,
  ) {
    await this.conductores.buscar(conductorId, usuario);
    if (!(await this.datos.eliminar(conductorId, eventoId))) {
      noExiste();
    }
  }
}
