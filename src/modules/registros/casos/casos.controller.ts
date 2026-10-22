import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiArchivo,
  ApiErrores,
  ApiPaginaResponse,
  ApiSesion,
} from '@/common/decorators/api.decorator';
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
import {
  EXPORTAN,
  Roles,
  TODOS_LOS_ROLES,
} from '@/common/decorators/roles.decorator';
import { UsuarioActual } from '@/common/decorators/usuario-actual.decorator';
import type { Pagina } from '@/common/dto/pagina.response.dto';
import { type UsuarioSesion } from '@/common/interfaces/usuario-sesion.interface';
import { IdPipe } from '@/common/pipes/id.pipe';
import {
  type Columna,
  excel,
  MAX_FILAS_EXCEL,
} from '@/common/utils/excel.util';
import { FiltroRegistrosDto } from '../dto/filtro-registros.query.dto';
import { CasosService } from './casos.service';
import { CasoDto } from './dto/caso.request.dto';
import { CasoResponseDto } from './dto/caso.response.dto';

const NOMBRE_PLANILLA = 'Historial Casos';
const NOMBRE_HOJA = 'Casos';

// Las mismas columnas que la planilla de la versión Laravel.
const COLUMNAS_EXCEL: Columna<CasoResponseDto>[] = [
  { titulo: 'Identificador', valor: (c) => c.id },
  { titulo: 'Fecha', valor: (c) => c.fecha, tipo: 'fecha' },
  { titulo: 'Local', valor: (c) => c.local },
  { titulo: 'Ciudad', valor: (c) => c.ciudad },
  { titulo: 'Conductor', valor: (c) => c.conductor },
  { titulo: 'Descripción', valor: (c) => c.descripcion },
];

// Casos excepcionales de un conductor en un local. Todos los roles los ven;
// los anotan y corrigen admin, encargado y coordinador, y los elimina solo admin.
@ApiTags('Casos excepcionales')
@ApiSesion()
@Controller('casos')
@Roles('admin', 'encargado', 'coordinador')
export class CasosController {
  constructor(private readonly casos: CasosService) {}

  @Get()
  @Roles(...TODOS_LOS_ROLES)
  @ApiOperation({ summary: 'Lista los casos excepcionales que la cuenta ve' })
  @ApiPaginaResponse(CasoResponseDto)
  @ApiErrores(400)
  listar(
    @Query() q: FiltroRegistrosDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<Pagina<CasoResponseDto>> {
    return this.casos.listar(q, usuario);
  }

  @Get('excel')
  @Roles(...EXPORTAN)
  @ApiOperation({ summary: 'Planilla con los casos que cumplen el filtro' })
  @ApiArchivo(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Planilla Excel',
  )
  @ApiErrores(400)
  async excel(
    @Query() q: FiltroRegistrosDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    const filas = await this.casos.todos(q, usuario, MAX_FILAS_EXCEL);
    return excel(NOMBRE_PLANILLA, NOMBRE_HOJA, COLUMNAS_EXCEL, filas);
  }

  @Post()
  @ApiOperation({ summary: 'Anota un caso excepcional' })
  @ApiCreatedResponse({ type: CasoResponseDto })
  @ApiErrores(400, 404, 409)
  crear(
    @Body() dto: CasoDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<CasoResponseDto> {
    return this.casos.crear(dto, usuario);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Corrige un caso excepcional' })
  @ApiOkResponse({ type: CasoResponseDto })
  @ApiErrores(400, 404, 409)
  editar(
    @Param('id', IdPipe) id: number,
    @Body() dto: CasoDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<CasoResponseDto> {
    return this.casos.editar(id, dto, usuario);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(204)
  @ApiOperation({ summary: 'Elimina un caso excepcional (solo admin)' })
  @ApiNoContentResponse()
  @ApiErrores(404)
  eliminar(@Param('id', IdPipe) id: number): Promise<void> {
    return this.casos.eliminar(id);
  }
}
