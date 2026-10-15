import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
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
import { BdService } from '../bd/bd.service.js';
import { IdPipe } from '../comun/id.pipe.js';
import { EventoDto, RangoDto } from './conductor.dto.js';
import { ConductoresService } from './conductores.service.js';

const SELECT_EVENTO = `
  select e.id,
         e.titulo,
         e.descripcion,
         e.desde,
         e.hasta,
         e.tipo_evento_id as "tipoEventoId",
         t.nombre as "tipoEvento",
         t.color
  from evento_conductor e
  join tipo_evento t on t.id = e.tipo_evento_id`;

function noExiste(): never {
  throw new NotFoundException({ statusCode: 404, codigo: 'evento_no_existe' });
}

// Eventos del calendario de un conductor (vacaciones, licencias…).
// Los ve quien puede ver al conductor; los anotan admin y asistente.
@Controller('conductores/:id/eventos')
@Roles('admin', 'asistente')
export class EventosController {
  constructor(
    private readonly bd: BdService,
    private readonly conductores: ConductoresService,
  ) {}

  // Los eventos que tocan algún día del rango pedido.
  @Get()
  @Roles(...TODOS_LOS_ROLES)
  async listar(
    @Param('id', IdPipe) id: number,
    @Query() rango: RangoDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    await this.conductores.buscar(id, usuario);
    return this.bd.consultar(
      `${SELECT_EVENTO}
       where e.conductor_id = $1 and e.desde <= $3 and e.hasta >= $2
       order by e.desde, e.id`,
      [id, rango.desde, rango.hasta],
    );
  }

  @Post()
  async crear(
    @Param('id', IdPipe) id: number,
    @Body() dto: EventoDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    await this.conductores.buscar(id, usuario);
    const [evento] = await this.bd.consultar<{ id: number }>(
      `insert into evento_conductor (conductor_id, tipo_evento_id, titulo, descripcion, desde, hasta)
       values ($1, $2, $3, $4, $5, $6) returning id`,
      [id, dto.tipoEventoId, dto.titulo, dto.descripcion, dto.desde, dto.hasta],
    );
    return this.uno(evento.id);
  }

  @Put(':eventoId')
  async editar(
    @Param('id', IdPipe) id: number,
    @Param('eventoId', IdPipe) eventoId: number,
    @Body() dto: EventoDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    await this.conductores.buscar(id, usuario);
    const cambiados = await this.bd.consultar(
      `update evento_conductor
       set tipo_evento_id = $3, titulo = $4, descripcion = $5, desde = $6, hasta = $7
       where id = $1 and conductor_id = $2 returning id`,
      [
        eventoId,
        id,
        dto.tipoEventoId,
        dto.titulo,
        dto.descripcion,
        dto.desde,
        dto.hasta,
      ],
    );
    if (cambiados.length === 0) {
      noExiste();
    }
    return this.uno(eventoId);
  }

  @Delete(':eventoId')
  @HttpCode(204)
  async eliminar(
    @Param('id', IdPipe) id: number,
    @Param('eventoId', IdPipe) eventoId: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    await this.conductores.buscar(id, usuario);
    const borrados = await this.bd.consultar(
      'delete from evento_conductor where id = $1 and conductor_id = $2 returning id',
      [eventoId, id],
    );
    if (borrados.length === 0) {
      noExiste();
    }
  }

  private async uno(eventoId: number) {
    const [evento] = await this.bd.consultar(
      `${SELECT_EVENTO} where e.id = $1`,
      [eventoId],
    );
    return evento;
  }
}
