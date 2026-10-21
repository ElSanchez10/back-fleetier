import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Roles, UsuarioActual, type UsuarioSesion } from '../auth/sesion.js';
import { IdPipe } from '../comun/id.pipe.js';
import { ProblemasService } from './problemas.service.js';
import { ProblemaDto } from './ruta.dto.js';

// Problemas de una ruta (pedidos que no se entregaron, etc.). Se listan con la
// ruta; los anotan admin, encargado y coordinador, y los elimina solo admin.
@Controller('rutas/:id/problemas')
@Roles('admin', 'encargado', 'coordinador')
export class ProblemasController {
  constructor(private readonly problemas: ProblemasService) {}

  @Post()
  crear(
    @Param('id', IdPipe) id: number,
    @Body() dto: ProblemaDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.problemas.crear(id, dto, usuario);
  }

  @Put(':problemaId')
  editar(
    @Param('id', IdPipe) id: number,
    @Param('problemaId', IdPipe) problemaId: number,
    @Body() dto: ProblemaDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.problemas.editar(id, problemaId, dto, usuario);
  }

  @Delete(':problemaId')
  @Roles('admin')
  @HttpCode(204)
  eliminar(
    @Param('id', IdPipe) id: number,
    @Param('problemaId', IdPipe) problemaId: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.problemas.eliminar(id, problemaId, usuario);
  }
}
