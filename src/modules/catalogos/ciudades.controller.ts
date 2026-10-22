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
import { CiudadDto } from './dto/ciudad.request.dto';
import { CiudadResponseDto } from './dto/ciudad.response.dto';
import type { CiudadRow } from './interfaces/catalogos-row.interface';

// Ciudades donde hay locales y conductores.
// Todos los roles pueden leerlos (los usan los formularios de la app); solo un
// admin los modifica.
@ApiTags('Catálogos')
@ApiSesion()
@Controller('ciudades')
export class CiudadesController {
  constructor(
    @Inject(CATALOGO.ciudades)
    private readonly catalogo: CatalogoService<
      CiudadDto,
      CiudadRow,
      CiudadResponseDto
    >,
  ) {}

  @Get()
  @Roles(...TODOS_LOS_ROLES)
  @ApiOperation({ summary: 'Lista las ciudades' })
  @ApiOkResponse({ type: [CiudadResponseDto] })
  listar(): Promise<CiudadResponseDto[]> {
    return this.catalogo.listar();
  }

  @Post()
  @ApiOperation({ summary: 'Crea una ciudad (solo admin)' })
  @ApiCreatedResponse({ type: CiudadResponseDto })
  @ApiErrores(400, 409)
  crear(@Body() dto: CiudadDto): Promise<CiudadResponseDto> {
    return this.catalogo.crear(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Renombra una ciudad (solo admin)' })
  @ApiOkResponse({ type: CiudadResponseDto })
  @ApiErrores(400, 404, 409)
  editar(
    @Param('id', IdPipe) id: number,
    @Body() dto: CiudadDto,
  ): Promise<CiudadResponseDto> {
    return this.catalogo.editar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Elimina una ciudad que nada usa (solo admin)' })
  @ApiNoContentResponse()
  @ApiErrores(404, 409)
  eliminar(@Param('id', IdPipe) id: number): Promise<void> {
    return this.catalogo.eliminar(id);
  }
}
