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

// El tipo del evento como parámetros: el id de uno existente o, si viene
// `tipoNuevo`, su nombre y color (para crearlo en la misma sentencia).
function tipoDe(dto: EventoDto) {
  const nuevo = dto.tipoNuevo;
  return {
    id: nuevo ? null : dto.tipoEventoId,
    nombre: nuevo?.nombre ?? null,
    color: nuevo?.color ?? null,
  };
}

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
    const tipo = tipoDe(dto);
    const [evento] = await this.bd.consultar<{ id: number }>(
      `with tipo as (
         insert into tipo_evento (nombre, color)
         select $7, $8::color where $7::text is not null
         returning id
       )
       insert into evento_conductor (conductor_id, tipo_evento_id, titulo, descripcion, desde, hasta)
       values ($1, coalesce((select id from tipo), $2::int), $3, $4, $5, $6) returning id`,
      [
        id,
        tipo.id,
        dto.titulo,
        dto.descripcion,
        dto.desde,
        dto.hasta,
        tipo.nombre,
        tipo.color,
      ],
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
    // El tipo nuevo solo se crea si el evento existe.
    const tipo = tipoDe(dto);
    const cambiados = await this.bd.consultar(
      `with tipo as (
         insert into tipo_evento (nombre, color)
         select $8, $9::color
         where $8::text is not null
           and exists (select 1 from evento_conductor where id = $1 and conductor_id = $2)
         returning id
       )
       update evento_conductor
       set tipo_evento_id = coalesce((select id from tipo), $3::int), titulo = $4,
           descripcion = $5, desde = $6, hasta = $7
       where id = $1 and conductor_id = $2 returning id`,
      [
        eventoId,
        id,
        tipo.id,
        dto.titulo,
        dto.descripcion,
        dto.desde,
        dto.hasta,
        tipo.nombre,
        tipo.color,
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
