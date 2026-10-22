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
import { AtrasosService } from './atrasos.service';
import { AtrasoDto } from './dto/atraso.request.dto';
import { FiltroAtrasosDto } from './dto/filtro-atrasos.query.dto';
import { AtrasoResponseDto } from './dto/atraso.response.dto';

const NOMBRE_PLANILLA = 'Historial Atrasos';
const NOMBRE_HOJA = 'Atrasos';

// Las mismas columnas que la planilla de la versión Laravel.
const COLUMNAS_EXCEL: Columna<AtrasoResponseDto>[] = [
  { titulo: 'Identificador', valor: (a) => a.id },
  { titulo: 'Fecha', valor: (a) => a.fecha, tipo: 'fecha' },
  { titulo: 'Local', valor: (a) => a.local },
  { titulo: 'Ciudad', valor: (a) => a.ciudad },
  { titulo: 'Cantidad', valor: (a) => a.cantidad, tipo: 'numero' },
  {
    titulo: 'Tipo',
    valor: (a) => (a.tipo === 'despacho' ? 'Despacho' : 'Picking'),
  },
];

// Órdenes que un local dejó atrasadas en un día. Todos los roles las ven; las
// anotan y corrigen admin, encargado y coordinador, y las elimina solo admin.
@ApiTags('Atrasos')
@ApiSesion()
@Controller('atrasos')
@Roles('admin', 'encargado', 'coordinador')
export class AtrasosController {
  constructor(private readonly atrasos: AtrasosService) {}

  @Get()
  @Roles(...TODOS_LOS_ROLES)
  @ApiOperation({ summary: 'Lista los atrasos que la cuenta ve' })
  @ApiPaginaResponse(AtrasoResponseDto)
  @ApiErrores(400)
  listar(
    @Query() q: FiltroAtrasosDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<Pagina<AtrasoResponseDto>> {
    return this.atrasos.listar(q, usuario);
  }

  @Get('excel')
  @Roles(...EXPORTAN)
  @ApiOperation({ summary: 'Planilla con los atrasos que cumplen el filtro' })
  @ApiArchivo(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Planilla Excel',
  )
  @ApiErrores(400)
  async excel(
    @Query() q: FiltroAtrasosDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    const filas = await this.atrasos.todos(q, usuario, MAX_FILAS_EXCEL);
    return excel(NOMBRE_PLANILLA, NOMBRE_HOJA, COLUMNAS_EXCEL, filas);
  }

  @Post()
  @ApiOperation({ summary: 'Anota un atraso' })
  @ApiCreatedResponse({ type: AtrasoResponseDto })
  @ApiErrores(400, 404, 409)
  crear(
    @Body() dto: AtrasoDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<AtrasoResponseDto> {
    return this.atrasos.crear(dto, usuario);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Corrige un atraso' })
  @ApiOkResponse({ type: AtrasoResponseDto })
  @ApiErrores(400, 404, 409)
  editar(
    @Param('id', IdPipe) id: number,
    @Body() dto: AtrasoDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<AtrasoResponseDto> {
    return this.atrasos.editar(id, dto, usuario);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(204)
  @ApiOperation({ summary: 'Elimina un atraso (solo admin)' })
  @ApiNoContentResponse()
  @ApiErrores(404)
  eliminar(@Param('id', IdPipe) id: number): Promise<void> {
    return this.atrasos.eliminar(id);
  }
}
