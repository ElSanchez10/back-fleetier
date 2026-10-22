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
import { DestinoDto } from './dto/destino.request.dto';
import { DestinoResponseDto } from './dto/destino.response.dto';
import type { DestinoRow } from './interfaces/catalogos-row.interface';

// Destinos de los pedidos especiales, con el precio que se propone para cada uno.
// Todos los roles pueden leerlos (los usan los formularios de la app); solo un
// admin los modifica.
@ApiTags('Catálogos')
@ApiSesion()
@Controller('destinos')
export class DestinosController {
  constructor(
    @Inject(CATALOGO.destinos)
    private readonly catalogo: CatalogoService<
      DestinoDto,
      DestinoRow,
      DestinoResponseDto
    >,
  ) {}

  @Get()
  @Roles(...TODOS_LOS_ROLES)
  @ApiOperation({ summary: 'Lista los destinos de los pedidos especiales' })
  @ApiOkResponse({ type: [DestinoResponseDto] })
  listar(): Promise<DestinoResponseDto[]> {
    return this.catalogo.listar();
  }

  @Post()
  @ApiOperation({ summary: 'Crea un destino (solo admin)' })
  @ApiCreatedResponse({ type: DestinoResponseDto })
  @ApiErrores(400, 409)
  crear(@Body() dto: DestinoDto): Promise<DestinoResponseDto> {
    return this.catalogo.crear(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Edita un destino (solo admin)' })
  @ApiOkResponse({ type: DestinoResponseDto })
  @ApiErrores(400, 404, 409)
  editar(
    @Param('id', IdPipe) id: number,
    @Body() dto: DestinoDto,
  ): Promise<DestinoResponseDto> {
    return this.catalogo.editar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Elimina un destino sin pedidos (solo admin)' })
  @ApiNoContentResponse()
  @ApiErrores(404, 409)
  eliminar(@Param('id', IdPipe) id: number): Promise<void> {
    return this.catalogo.eliminar(id);
  }
}
