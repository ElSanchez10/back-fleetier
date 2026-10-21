import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Roles, UsuarioActual, type UsuarioSesion } from '../auth/sesion.js';
import { IdPipe } from '../comun/id.pipe.js';
import { CuentaDto, EditarCuentaDto } from './conductor.dto.js';
import { CuentasService } from './cuentas.service.js';

// Cuentas del conductor en aplicaciones externas (las reglas, en
// CuentasService). Son credenciales ajenas: solo las ven admin y asistente, y
// solo admin las elimina.
@Controller('conductores/:id/cuentas')
@Roles('admin', 'asistente')
export class CuentasController {
  constructor(private readonly cuentas: CuentasService) {}

  @Get()
  listar(
    @Param('id', IdPipe) id: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.cuentas.listar(id, usuario);
  }

  @Get(':cuentaId/clave')
  clave(
    @Param('id', IdPipe) id: number,
    @Param('cuentaId', IdPipe) cuentaId: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.cuentas.clave(id, cuentaId, usuario);
  }

  @Post()
  crear(
    @Param('id', IdPipe) id: number,
    @Body() dto: CuentaDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.cuentas.crear(id, dto, usuario);
  }

  @Put(':cuentaId')
  editar(
    @Param('id', IdPipe) id: number,
    @Param('cuentaId', IdPipe) cuentaId: number,
    @Body() dto: EditarCuentaDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.cuentas.editar(id, cuentaId, dto, usuario);
  }

  @Delete(':cuentaId')
  @Roles('admin')
  @HttpCode(204)
  eliminar(
    @Param('id', IdPipe) id: number,
    @Param('cuentaId', IdPipe) cuentaId: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.cuentas.eliminar(id, cuentaId, usuario);
  }
}
