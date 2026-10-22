import { Injectable, NotFoundException } from '@nestjs/common';
import type { UsuarioSesion } from '@/common/interfaces/usuario-sesion.interface';
import { ConductoresService } from '../conductores.service';
import type { RangoDto } from '../dto/rango.query.dto';
import type { EventoDto } from './dto/evento.request.dto';
import { EventosRepository } from './repositories/eventos.repository';
import { datosDelEvento } from './utils/eventos.util';

import { EventoResponseDto } from './dto/evento.response.dto';

function noExiste(): never {
  throw new NotFoundException({ codigo: 'evento_no_existe' });
}

// Eventos del calendario de un conductor (vacaciones, licencias…). Los ve
// quien puede ver al conductor; quién los anota lo decide el controlador.
@Injectable()
export class EventosService {
  constructor(
    private readonly datos: EventosRepository,
    private readonly conductores: ConductoresService,
  ) {}

  async listar(
    conductorId: number,
    rango: RangoDto,
    usuario: UsuarioSesion,
  ): Promise<EventoResponseDto[]> {
    await this.conductores.buscar(conductorId, usuario);
    const filas = await this.datos.listar(conductorId, rango);
    return filas.map(EventoResponseDto.fromRow);
  }

  async crear(
    conductorId: number,
    dto: EventoDto,
    usuario: UsuarioSesion,
  ): Promise<EventoResponseDto> {
    await this.conductores.buscar(conductorId, usuario);
    const id = await this.datos.insertar(conductorId, datosDelEvento(dto));
    return this.uno(id);
  }

  async editar(
    conductorId: number,
    eventoId: number,
    dto: EventoDto,
    usuario: UsuarioSesion,
  ): Promise<EventoResponseDto> {
    await this.conductores.buscar(conductorId, usuario);
    if (
      !(await this.datos.actualizar(conductorId, eventoId, datosDelEvento(dto)))
    ) {
      noExiste();
    }
    return this.uno(eventoId);
  }

  async eliminar(
    conductorId: number,
    eventoId: number,
    usuario: UsuarioSesion,
  ): Promise<void> {
    await this.conductores.buscar(conductorId, usuario);
    if (!(await this.datos.eliminar(conductorId, eventoId))) {
      noExiste();
    }
  }

  private async uno(id: number): Promise<EventoResponseDto> {
    return EventoResponseDto.fromRow((await this.datos.uno(id)) ?? noExiste());
  }
}
