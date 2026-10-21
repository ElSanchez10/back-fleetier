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
import { UsuarioActual, type UsuarioSesion } from '../auth/sesion.js';
import { IdPipe } from '../comun/id.pipe.js';
import { Pagina } from '../comun/paginacion.js';
import { ListarUsuariosDto, UsuarioDto } from './usuario.dto.js';
import { UsuariosService } from './usuarios.service.js';

// Administración de cuentas (las reglas, en UsuariosService): solo para el rol
// admin (ninguna ruta se abre a otros roles).
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  // Busca por nombre, correo, local o ciudad. Se puede acotar a un local o a
  // las cuentas sin local.
  @Get()
  listar(@Query() q: ListarUsuariosDto): Promise<Pagina<unknown>> {
    return this.usuarios.listar(q);
  }

  @Post()
  crear(@Body() dto: UsuarioDto) {
    return this.usuarios.crear(dto);
  }

  @Put(':id')
  editar(
    @Param('id', IdPipe) id: number,
    @Body() dto: UsuarioDto,
    @UsuarioActual() yo: UsuarioSesion,
  ) {
    return this.usuarios.editar(id, dto, yo);
  }

  @Post(':id/restablecer')
  @HttpCode(200)
  restablecer(@Param('id', IdPipe) id: number) {
    return this.usuarios.restablecer(id);
  }

  @Delete(':id')
  @HttpCode(204)
  eliminar(
    @Param('id', IdPipe) id: number,
    @UsuarioActual() yo: UsuarioSesion,
  ) {
    return this.usuarios.eliminar(id, yo);
  }
}
