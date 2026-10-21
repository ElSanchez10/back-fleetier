import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  Roles,
  TODOS_LOS_ROLES,
  UsuarioActual,
  type UsuarioSesion,
} from '../auth/sesion.js';
import { IdPipe } from '../comun/id.pipe.js';
import { RangoDto } from './conductor.dto.js';
import { ConductoresService } from './conductores.service.js';

// Lo que ha hecho un conductor: sus rutas en un rango de días (las muestra su
// calendario) y el resumen de órdenes por local. Lo ve quien ve al conductor.
@Controller('conductores/:id')
@Roles(...TODOS_LOS_ROLES)
export class RutasConductorController {
  constructor(private readonly conductores: ConductoresService) {}

  @Get('rutas')
  rutas(
    @Param('id', IdPipe) id: number,
    @Query() rango: RangoDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.conductores.rutas(id, rango, usuario);
  }

  // Órdenes y rutas por local en el rango; `ordenes` es el total.
  @Get('actividad')
  actividad(
    @Param('id', IdPipe) id: number,
    @Query() rango: RangoDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.conductores.actividad(id, rango, usuario);
  }
}
