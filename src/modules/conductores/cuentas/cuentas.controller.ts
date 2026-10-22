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
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrores, ApiSesion } from '@/common/decorators/api.decorator';
import {
  ClaveCuentaResponseDto,
  CuentaResponseDto,
} from './dto/cuenta.response.dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { UsuarioActual } from '@/common/decorators/usuario-actual.decorator';
import { type UsuarioSesion } from '@/common/interfaces/usuario-sesion.interface';
import { IdPipe } from '@/common/pipes/id.pipe';
import { CuentasService } from './cuentas.service';
import { CuentaDto } from './dto/cuenta.request.dto';
import { EditarCuentaDto } from './dto/editar-cuenta.request.dto';

// Cuentas del conductor en aplicaciones externas (las reglas, en
// CuentasService). Son credenciales ajenas: solo las ven admin y asistente, y
// solo admin las elimina.
@ApiTags('Conductores')
@ApiSesion()
@Controller('conductores/:id/cuentas')
@Roles('admin', 'asistente')
export class CuentasController {
  constructor(private readonly cuentas: CuentasService) {}

  @Get()
  @ApiOperation({
    summary:
      'Las cuentas del driver en apps externas, sin contraseñas (admin y asistente)',
  })
  @ApiOkResponse({ type: [CuentaResponseDto] })
  @ApiErrores(404)
  listar(
    @Param('id', IdPipe) id: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<CuentaResponseDto[]> {
    return this.cuentas.listar(id, usuario);
  }

  @Get(':cuentaId/clave')
  @ApiOperation({ summary: 'La contraseña de una cuenta, descifrada' })
  @ApiOkResponse({ type: ClaveCuentaResponseDto })
  @ApiErrores(404, 503)
  clave(
    @Param('id', IdPipe) id: number,
    @Param('cuentaId', IdPipe) cuentaId: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<ClaveCuentaResponseDto> {
    return this.cuentas.clave(id, cuentaId, usuario);
  }

  @Post()
  @ApiOperation({ summary: 'Guarda una cuenta; la contraseña queda cifrada' })
  @ApiCreatedResponse({ type: CuentaResponseDto })
  @ApiErrores(400, 404, 503)
  crear(
    @Param('id', IdPipe) id: number,
    @Body() dto: CuentaDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<CuentaResponseDto> {
    return this.cuentas.crear(id, dto, usuario);
  }

  @Put(':cuentaId')
  @ApiOperation({
    summary: 'Edita una cuenta; sin contraseña nueva, queda la que estaba',
  })
  @ApiOkResponse({ type: CuentaResponseDto })
  @ApiErrores(400, 404, 503)
  editar(
    @Param('id', IdPipe) id: number,
    @Param('cuentaId', IdPipe) cuentaId: number,
    @Body() dto: EditarCuentaDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<CuentaResponseDto> {
    return this.cuentas.editar(id, cuentaId, dto, usuario);
  }

  @Delete(':cuentaId')
  @Roles('admin')
  @HttpCode(204)
  @ApiOperation({ summary: 'Elimina una cuenta (solo admin)' })
  @ApiNoContentResponse()
  @ApiErrores(404)
  eliminar(
    @Param('id', IdPipe) id: number,
    @Param('cuentaId', IdPipe) cuentaId: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<void> {
    return this.cuentas.eliminar(id, cuentaId, usuario);
  }
}
