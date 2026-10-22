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
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrores, ApiSesion } from '@/common/decorators/api.decorator';
import { EventoResponseDto } from './dto/evento.response.dto';
import { Roles, TODOS_LOS_ROLES } from '@/common/decorators/roles.decorator';
import { UsuarioActual } from '@/common/decorators/usuario-actual.decorator';
import { type UsuarioSesion } from '@/common/interfaces/usuario-sesion.interface';
import { IdPipe } from '@/common/pipes/id.pipe';
import { RangoDto } from '../dto/rango.query.dto';
import { EventoDto } from './dto/evento.request.dto';
import { EventosService } from './eventos.service';

// Eventos del calendario de un conductor (vacaciones, licencias…). Los ve
// quien puede ver al conductor; los anotan admin y asistente.
@ApiTags('Conductores')
@ApiSesion()
@Controller('conductores/:id/eventos')
@Roles('admin', 'asistente')
export class EventosController {
  constructor(private readonly eventos: EventosService) {}

  // Los eventos que tocan algún día del rango pedido.
  @Get()
  @Roles(...TODOS_LOS_ROLES)
  @ApiOperation({
    summary: 'Los eventos del calendario que tocan algún día del rango',
  })
  @ApiOkResponse({ type: [EventoResponseDto] })
  @ApiErrores(400, 404)
  listar(
    @Param('id', IdPipe) id: number,
    @Query() rango: RangoDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<EventoResponseDto[]> {
    return this.eventos.listar(id, rango, usuario);
  }

  @Post()
  @ApiOperation({
    summary:
      'Anota un evento; con `tipoNuevo` crea también su tipo (admin y asistente)',
  })
  @ApiCreatedResponse({ type: EventoResponseDto })
  @ApiErrores(400, 404, 409)
  crear(
    @Param('id', IdPipe) id: number,
    @Body() dto: EventoDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<EventoResponseDto> {
    return this.eventos.crear(id, dto, usuario);
  }

  @Put(':eventoId')
  @ApiOperation({ summary: 'Edita un evento (admin y asistente)' })
  @ApiOkResponse({ type: EventoResponseDto })
  @ApiErrores(400, 404, 409)
  editar(
    @Param('id', IdPipe) id: number,
    @Param('eventoId', IdPipe) eventoId: number,
    @Body() dto: EventoDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<EventoResponseDto> {
    return this.eventos.editar(id, eventoId, dto, usuario);
  }

  @Delete(':eventoId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Elimina un evento (admin y asistente)' })
  @ApiNoContentResponse()
  @ApiErrores(404)
  eliminar(
    @Param('id', IdPipe) id: number,
    @Param('eventoId', IdPipe) eventoId: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<void> {
    return this.eventos.eliminar(id, eventoId, usuario);
  }
}
