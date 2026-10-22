import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiArchivo,
  ApiErrores,
  ApiSesion,
} from '@/common/decorators/api.decorator';
import {
  EXPORTAN,
  Roles,
  TODOS_LOS_ROLES,
} from '@/common/decorators/roles.decorator';
import { UsuarioActual } from '@/common/decorators/usuario-actual.decorator';
import { type UsuarioSesion } from '@/common/interfaces/usuario-sesion.interface';
import { IdPipe } from '@/common/pipes/id.pipe';
import {
  type Columna,
  excel,
  MAX_FILAS_EXCEL,
} from '@/common/utils/excel.util';
import { ConductoresService } from './conductores.service';
import { ConductorDto } from './dto/conductor.request.dto';
import { FiltroConductoresDto } from './dto/filtro-conductores.query.dto';
import { ConductorResponseDto } from './dto/conductor.response.dto';
import { ListadoConductoresResponseDto } from './dto/listado-conductores.response.dto';
import { RangoDto } from './dto/rango.query.dto';
import {
  ActividadConductorResponseDto,
  RutaDeConductorResponseDto,
} from './dto/ruta-de-conductor.response.dto';
import { formatearRun } from './utils/run.util';

// Las mismas columnas que la planilla de la versión Laravel.
const COLUMNAS_EXCEL: Columna<ConductorResponseDto>[] = [
  { titulo: 'Identificador', valor: (d) => d.id },
  { titulo: 'Nombre', valor: (d) => d.nombre },
  { titulo: 'RUN', valor: (d) => formatearRun(d.run) },
  {
    titulo: 'Fecha de Nacimiento',
    valor: (d) => d.fechaNacimiento,
    tipo: 'fecha',
  },
  { titulo: 'Contacto', valor: (d) => d.telefono },
  { titulo: 'Correo', valor: (d) => d.email },
  { titulo: 'Clasificación', valor: (d) => d.tipoConductor },
];

// Conductores que hacen las rutas (las reglas, en ConductoresService). Todos
// los roles los ven; los registran y editan admin y asistente.
@ApiTags('Conductores')
@ApiSesion()
@Controller('conductores')
@Roles(...TODOS_LOS_ROLES)
export class ConductoresController {
  constructor(private readonly conductores: ConductoresService) {}

  // Además del tramo pedido, devuelve el resumen de todos los que la cuenta
  // puede ver (sin los filtros).
  @Get()
  @ApiOperation({ summary: 'Lista los drivers que la cuenta ve (su ciudad)' })
  @ApiOkResponse({ type: ListadoConductoresResponseDto })
  @ApiErrores(400)
  listar(
    @Query() q: FiltroConductoresDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<ListadoConductoresResponseDto> {
    return this.conductores.listar(q, usuario);
  }

  // Planilla con los conductores que cumplen el filtro.
  @Get('excel')
  @Roles(...EXPORTAN)
  @ApiOperation({ summary: 'Planilla con los drivers que cumplen el filtro' })
  @ApiArchivo(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Planilla Excel',
  )
  @ApiErrores(400)
  async excel(
    @Query() q: FiltroConductoresDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    const conductores = await this.conductores.todos(
      q,
      usuario,
      MAX_FILAS_EXCEL,
    );
    return excel('Drivers', 'Drivers', COLUMNAS_EXCEL, conductores);
  }

  @Get(':id')
  @ApiOperation({ summary: 'La ficha de un driver' })
  @ApiOkResponse({ type: ConductorResponseDto })
  @ApiErrores(404)
  uno(
    @Param('id', IdPipe) id: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<ConductorResponseDto> {
    return this.conductores.buscar(id, usuario);
  }

  // Sus rutas en un rango de días (las muestra su calendario).
  @Get(':id/rutas')
  @ApiOperation({ summary: 'Las rutas del driver en un rango de días' })
  @ApiOkResponse({ type: [RutaDeConductorResponseDto] })
  @ApiErrores(400, 404)
  rutas(
    @Param('id', IdPipe) id: number,
    @Query() rango: RangoDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<RutaDeConductorResponseDto[]> {
    return this.conductores.rutas(id, rango, usuario);
  }

  // Órdenes y rutas por local en el rango; `ordenes` es el total.
  @Get(':id/actividad')
  @ApiOperation({ summary: 'Órdenes y rutas del driver por local en un rango' })
  @ApiOkResponse({ type: ActividadConductorResponseDto })
  @ApiErrores(400, 404)
  actividad(
    @Param('id', IdPipe) id: number,
    @Query() rango: RangoDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<ActividadConductorResponseDto> {
    return this.conductores.actividad(id, rango, usuario);
  }

  @Post()
  @Roles('admin', 'asistente')
  @ApiOperation({ summary: 'Registra un driver (admin y asistente)' })
  @ApiCreatedResponse({ type: ConductorResponseDto })
  @ApiErrores(400, 409)
  crear(
    @Body() dto: ConductorDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<ConductorResponseDto> {
    return this.conductores.crear(dto, usuario);
  }

  @Put(':id')
  @Roles('admin', 'asistente')
  @ApiOperation({ summary: 'Edita un driver (admin y asistente)' })
  @ApiOkResponse({ type: ConductorResponseDto })
  @ApiErrores(400, 404, 409)
  editar(
    @Param('id', IdPipe) id: number,
    @Body() dto: ConductorDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<ConductorResponseDto> {
    return this.conductores.editar(id, dto, usuario);
  }
}
