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
import { IdPipe } from '@/common/pipes/id.pipe';
import { CATALOGO, CatalogoService } from './catalogos.service';
import { TipoConductorDto } from './dto/tipo-conductor.request.dto';
import { TipoConductorResponseDto } from './dto/tipo-conductor.response.dto';
import type { TipoConductorRow } from './interfaces/catalogos-row.interface';

// Clasificación de los conductores.
// Todos los roles pueden leerlos (los usan los formularios de la app); solo un
// admin los modifica.
@ApiTags('Catálogos')
@ApiSesion()
@Controller('tipos-conductor')
export class TiposConductorController {
  constructor(
    @Inject(CATALOGO.tiposConductor)
    private readonly catalogo: CatalogoService<
      TipoConductorDto,
      TipoConductorRow,
      TipoConductorResponseDto
    >,
  ) {}

  @Get()
  @Roles(...TODOS_LOS_ROLES)
  @ApiOperation({ summary: 'Lista las clasificaciones de los drivers' })
  @ApiOkResponse({ type: [TipoConductorResponseDto] })
  listar(): Promise<TipoConductorResponseDto[]> {
    return this.catalogo.listar();
  }

  @Post()
  @ApiOperation({ summary: 'Crea una clasificación (solo admin)' })
  @ApiCreatedResponse({ type: TipoConductorResponseDto })
  @ApiErrores(400, 409)
  crear(@Body() dto: TipoConductorDto): Promise<TipoConductorResponseDto> {
    return this.catalogo.crear(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Renombra una clasificación (solo admin)' })
  @ApiOkResponse({ type: TipoConductorResponseDto })
  @ApiErrores(400, 404, 409)
  editar(
    @Param('id', IdPipe) id: number,
    @Body() dto: TipoConductorDto,
  ): Promise<TipoConductorResponseDto> {
    return this.catalogo.editar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Elimina una clasificación sin drivers (solo admin)',
  })
  @ApiNoContentResponse()
  @ApiErrores(404, 409)
  eliminar(@Param('id', IdPipe) id: number): Promise<void> {
    return this.catalogo.eliminar(id);
  }
}
