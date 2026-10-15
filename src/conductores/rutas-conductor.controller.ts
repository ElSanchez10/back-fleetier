import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  Roles,
  TODOS_LOS_ROLES,
  UsuarioActual,
  type UsuarioSesion,
} from '../auth/sesion.js';
import { BdService } from '../bd/bd.service.js';
import { IdPipe } from '../comun/id.pipe.js';
import { RangoDto } from './conductor.dto.js';
import { ConductoresService } from './conductores.service.js';

// El día de Chile en que sale una ruta.
const DIA_RUTA = `(r.fecha at time zone 'America/Santiago')::date`;

// Lo que ha hecho un conductor: sus rutas en un rango de días (las muestra su
// calendario) y el resumen de órdenes por local. Lo ve quien ve al conductor.
@Controller('conductores/:id')
@Roles(...TODOS_LOS_ROLES)
export class RutasConductorController {
  constructor(
    private readonly bd: BdService,
    private readonly conductores: ConductoresService,
  ) {}

  @Get('rutas')
  async rutas(
    @Param('id', IdPipe) id: number,
    @Query() rango: RangoDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    await this.conductores.buscar(id, usuario);
    return this.bd.consultar(
      `select r.id,
              to_char(r.fecha at time zone 'America/Santiago', 'YYYY-MM-DD"T"HH24:MI') as fecha,
              r.ordenes,
              r.estado,
              l.nombre as local
       from ruta r
       join local l on l.id = r.local_id
       where r.conductor_id = $1 and ${DIA_RUTA} between $2 and $3
       order by r.fecha, r.id`,
      [id, rango.desde, rango.hasta],
    );
  }

  // Órdenes y rutas por local en el rango; `ordenes` es el total.
  @Get('actividad')
  async actividad(
    @Param('id', IdPipe) id: number,
    @Query() rango: RangoDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    await this.conductores.buscar(id, usuario);
    const locales = await this.bd.consultar<{ ordenes: number }>(
      `select l.nombre as local,
              c.nombre as ciudad,
              count(*)::int as rutas,
              sum(r.ordenes)::int as ordenes
       from ruta r
       join local l on l.id = r.local_id
       join ciudad c on c.id = l.ciudad_id
       where r.conductor_id = $1 and ${DIA_RUTA} between $2 and $3
       group by l.id, l.nombre, c.nombre
       order by ordenes desc, lower(l.nombre)`,
      [id, rango.desde, rango.hasta],
    );
    return {
      locales,
      ordenes: locales.reduce((suma, l) => suma + l.ordenes, 0),
    };
  }
}
