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
import { TipoEventoDto } from './dto/tipo-evento.request.dto';
import { TipoEventoResponseDto } from './dto/tipo-evento.response.dto';
import type { TipoEventoRow } from './interfaces/catalogos-row.interface';

// Tipos de evento del calendario de un conductor.
// Todos los roles pueden leerlos (los usan los formularios de la app); solo un
// admin los modifica.
@ApiTags('Catálogos')
@ApiSesion()
@Controller('tipos-evento')
export class TiposEventoController {
  constructor(
    @Inject(CATALOGO.tiposEvento)
    private readonly catalogo: CatalogoService<
      TipoEventoDto,
      TipoEventoRow,
      TipoEventoResponseDto
    >,
  ) {}

  @Get()
  @Roles(...TODOS_LOS_ROLES)
  @ApiOperation({ summary: 'Lista los tipos de evento del calendario' })
  @ApiOkResponse({ type: [TipoEventoResponseDto] })
  listar(): Promise<TipoEventoResponseDto[]> {
    return this.catalogo.listar();
  }

  @Post()
  @ApiOperation({ summary: 'Crea un tipo de evento (solo admin)' })
  @ApiCreatedResponse({ type: TipoEventoResponseDto })
  @ApiErrores(400, 409)
  crear(@Body() dto: TipoEventoDto): Promise<TipoEventoResponseDto> {
    return this.catalogo.crear(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Edita un tipo de evento (solo admin)' })
  @ApiOkResponse({ type: TipoEventoResponseDto })
  @ApiErrores(400, 404, 409)
  editar(
    @Param('id', IdPipe) id: number,
    @Body() dto: TipoEventoDto,
  ): Promise<TipoEventoResponseDto> {
    return this.catalogo.editar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Elimina un tipo de evento sin eventos (solo admin)',
  })
  @ApiNoContentResponse()
  @ApiErrores(404, 409)
  eliminar(@Param('id', IdPipe) id: number): Promise<void> {
    return this.catalogo.eliminar(id);
  }
}
