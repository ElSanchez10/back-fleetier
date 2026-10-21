import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  Roles,
  TODOS_LOS_ROLES,
  UsuarioActual,
  type UsuarioSesion,
} from '../auth/sesion.js';
import { IdPipe } from '../comun/id.pipe.js';
import { EventoDto, RangoDto } from './conductor.dto.js';
import { EventosService } from './eventos.service.js';

// Eventos del calendario de un conductor (vacaciones, licencias…). Los ve
// quien puede ver al conductor; los anotan admin y asistente.
@Controller('conductores/:id/eventos')
@Roles('admin', 'asistente')
export class EventosController {
  constructor(private readonly eventos: EventosService) {}

  // Los eventos que tocan algún día del rango pedido.
  @Get()
  @Roles(...TODOS_LOS_ROLES)
  listar(
    @Param('id', IdPipe) id: number,
    @Query() rango: RangoDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.eventos.listar(id, rango, usuario);
  }

  @Post()
  crear(
    @Param('id', IdPipe) id: number,
    @Body() dto: EventoDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.eventos.crear(id, dto, usuario);
  }

  @Put(':eventoId')
  editar(
    @Param('id', IdPipe) id: number,
    @Param('eventoId', IdPipe) eventoId: number,
    @Body() dto: EventoDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.eventos.editar(id, eventoId, dto, usuario);
  }

  @Delete(':eventoId')
  @HttpCode(204)
  eliminar(
    @Param('id', IdPipe) id: number,
    @Param('eventoId', IdPipe) eventoId: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.eventos.eliminar(id, eventoId, usuario);
  }
}
