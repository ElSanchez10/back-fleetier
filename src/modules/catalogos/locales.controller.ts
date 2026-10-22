import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
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
import { Roles, TODOS_LOS_ROLES } from '@/common/decorators/roles.decorator';
import { UsuarioActual } from '@/common/decorators/usuario-actual.decorator';
import type { UsuarioSesion } from '@/common/interfaces/usuario-sesion.interface';
import { IdPipe } from '@/common/pipes/id.pipe';
import { CATALOGO, LocalesService } from './catalogos.service';
import { LocalDto } from './dto/local.request.dto';
import { LocalResponseDto } from './dto/local.response.dto';

// Locales desde donde salen las rutas, cada uno en su ciudad.
// Todos los roles pueden leerlos; solo un admin los modifica.
@ApiTags('Catálogos')
@ApiSesion()
@Controller('locales')
export class LocalesController {
  constructor(
    @Inject(CATALOGO.locales) private readonly locales: LocalesService,
  ) {}

  // Una cuenta con local solo recibe el suyo: es el único que puede elegir.
  @Get()
  @Roles(...TODOS_LOS_ROLES)
  @ApiOperation({
    summary: 'Lista los locales (una cuenta con local recibe solo el suyo)',
  })
  @ApiOkResponse({ type: [LocalResponseDto] })
  listar(@UsuarioActual() usuario: UsuarioSesion): Promise<LocalResponseDto[]> {
    return this.locales.listarPara(usuario);
  }

  @Post()
  @ApiOperation({ summary: 'Crea un local (solo admin)' })
  @ApiCreatedResponse({ type: LocalResponseDto })
  @ApiErrores(400, 409)
  crear(@Body() dto: LocalDto): Promise<LocalResponseDto> {
    return this.locales.crear(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Edita un local (solo admin)' })
  @ApiOkResponse({ type: LocalResponseDto })
  @ApiErrores(400, 404, 409)
  editar(
    @Param('id', IdPipe) id: number,
    @Body() dto: LocalDto,
  ): Promise<LocalResponseDto> {
    return this.locales.editar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Elimina un local que nada usa (solo admin)' })
  @ApiNoContentResponse()
  @ApiErrores(404, 409)
  eliminar(@Param('id', IdPipe) id: number): Promise<void> {
    return this.locales.eliminar(id);
  }
}
