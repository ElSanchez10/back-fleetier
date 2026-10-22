import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrores, ApiSesion } from '@/common/decorators/api.decorator';
import { DevolucionResponseDto } from './dto/devolucion.response.dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { UsuarioActual } from '@/common/decorators/usuario-actual.decorator';
import { type UsuarioSesion } from '@/common/interfaces/usuario-sesion.interface';
import { DevolucionesService } from './devoluciones.service';
import { DevolucionDto } from './dto/devolucion.request.dto';

// Coolers que vuelven al local, leídos con la pistola (las reglas, en
// DevolucionesService y OperacionesService).
@ApiTags('Rutas')
@ApiSesion()
@Controller('devoluciones')
@Roles('admin', 'encargado', 'coordinador')
export class DevolucionesController {
  constructor(private readonly devoluciones: DevolucionesService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Un cooler volvió al local (leído con la pistola): queda disponible y devuelto en su ruta',
  })
  @ApiOkResponse({ type: DevolucionResponseDto })
  @ApiErrores(400, 404, 409)
  devolver(
    @Body() dto: DevolucionDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<DevolucionResponseDto> {
    return this.devoluciones.devolver(dto.codigo, usuario);
  }
}
