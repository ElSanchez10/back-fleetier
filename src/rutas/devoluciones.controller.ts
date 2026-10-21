import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Roles, UsuarioActual, type UsuarioSesion } from '../auth/sesion.js';
import { DevolucionesService } from './devoluciones.service.js';
import { DevolucionDto } from './ruta.dto.js';

// Coolers que vuelven al local, leídos con la pistola (las reglas, en
// DevolucionesService y OperacionesService).
@Controller('devoluciones')
@Roles('admin', 'encargado', 'coordinador')
export class DevolucionesController {
  constructor(private readonly devoluciones: DevolucionesService) {}

  @Post()
  @HttpCode(200)
  devolver(
    @Body() dto: DevolucionDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.devoluciones.devolver(dto.codigo, usuario);
  }
}
