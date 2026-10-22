import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@/common/database/database.service';
import type { RangoDto } from '../../dto/rango.query.dto';
import type { EventoRow } from '../interfaces/evento-row.interface';

// Acceso a los eventos del calendario de los conductores, para EventosService.

// El tipo del evento: el id de uno existente o, si `nombre` viene, uno nuevo
// que se crea en la misma sentencia (con ese nombre y color).
export interface TipoDeEvento {
  id: number | null;
  nombre: string | null;
  color: string | null;
}

export interface DatosEvento {
  titulo: string;
  descripcion: string | null;
  desde: string;
  hasta: string;
  tipo: TipoDeEvento;
}

const SELECT_EVENTO = `
  select e.id,
         e.titulo,
         e.descripcion,
         e.desde,
         e.hasta,
         e.tipo_evento_id,
         t.nombre as tipo_evento,
         t.color
  from evento_conductor e
  join tipo_evento t on t.id = e.tipo_evento_id`;

@Injectable()
export class EventosRepository {
  constructor(private readonly bd: DatabaseService) {}

  // Los que tocan algún día del rango.
  listar(conductorId: number, rango: RangoDto): Promise<EventoRow[]> {
    return this.bd.consultar<EventoRow>(
      `${SELECT_EVENTO}
       where e.conductor_id = $1 and e.desde <= $3 and e.hasta >= $2
       order by e.desde, e.id`,
      [conductorId, rango.desde, rango.hasta],
    );
  }

  async uno(eventoId: number): Promise<EventoRow | undefined> {
    const [evento] = await this.bd.consultar<EventoRow>(
      `${SELECT_EVENTO} where e.id = $1`,
      [eventoId],
    );
    return evento;
  }

  async insertar(conductorId: number, e: DatosEvento): Promise<number> {
    const [{ id }] = await this.bd.consultar<{ id: number }>(
      `with tipo as (
         insert into tipo_evento (nombre, color)
         select $7, $8::color where $7::text is not null
         returning id
       )
       insert into evento_conductor (conductor_id, tipo_evento_id, titulo, descripcion, desde, hasta)
       values ($1, coalesce((select id from tipo), $2::int), $3, $4, $5, $6) returning id`,
      [
        conductorId,
        e.tipo.id,
        e.titulo,
        e.descripcion,
        e.desde,
        e.hasta,
        e.tipo.nombre,
        e.tipo.color,
      ],
    );
    return id;
  }

  // El tipo nuevo solo se crea si el evento existe. false si no existe.
  async actualizar(
    conductorId: number,
    eventoId: number,
    e: DatosEvento,
  ): Promise<boolean> {
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
        conductorId,
        e.tipo.id,
        e.titulo,
        e.descripcion,
        e.desde,
        e.hasta,
        e.tipo.nombre,
        e.tipo.color,
      ],
    );
    return cambiados.length > 0;
  }

  async eliminar(conductorId: number, eventoId: number): Promise<boolean> {
    const borrados = await this.bd.consultar(
      'delete from evento_conductor where id = $1 and conductor_id = $2 returning id',
      [eventoId, conductorId],
    );
    return borrados.length > 0;
  }
}
