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
import { TipoCoolerDto } from './dto/tipo-cooler.request.dto';
import { TipoCoolerResponseDto } from './dto/tipo-cooler.response.dto';
import type { TipoCoolerRow } from './interfaces/catalogos-row.interface';

// Tipos de cooler: marca, capacidad y el color con que se muestran.
// Todos los roles pueden leerlos (los usan los formularios de la app); solo un
// admin los modifica. Quien registra un cooler puede además crear uno nuevo
// junto con él (POST /coolers con `tipoNuevo`).
@ApiTags('Catálogos')
@ApiSesion()
@Controller('tipos-cooler')
export class TiposCoolerController {
  constructor(
    @Inject(CATALOGO.tiposCooler)
    private readonly catalogo: CatalogoService<
      TipoCoolerDto,
      TipoCoolerRow,
      TipoCoolerResponseDto
    >,
  ) {}

  @Get()
  @Roles(...TODOS_LOS_ROLES)
  @ApiOperation({ summary: 'Lista los tipos de cooler' })
  @ApiOkResponse({ type: [TipoCoolerResponseDto] })
  listar(): Promise<TipoCoolerResponseDto[]> {
    return this.catalogo.listar();
  }

  @Post()
  @ApiOperation({ summary: 'Crea un tipo de cooler (solo admin)' })
  @ApiCreatedResponse({ type: TipoCoolerResponseDto })
  @ApiErrores(400, 409)
  crear(@Body() dto: TipoCoolerDto): Promise<TipoCoolerResponseDto> {
    return this.catalogo.crear(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Edita un tipo de cooler (solo admin)' })
  @ApiOkResponse({ type: TipoCoolerResponseDto })
  @ApiErrores(400, 404, 409)
  editar(
    @Param('id', IdPipe) id: number,
    @Body() dto: TipoCoolerDto,
  ): Promise<TipoCoolerResponseDto> {
    return this.catalogo.editar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Elimina un tipo de cooler sin coolers (solo admin)',
  })
  @ApiNoContentResponse()
  @ApiErrores(404, 409)
  eliminar(@Param('id', IdPipe) id: number): Promise<void> {
    return this.catalogo.eliminar(id);
  }
}
