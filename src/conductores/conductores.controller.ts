import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import {
  Roles,
  TODOS_LOS_ROLES,
  UsuarioActual,
  type UsuarioSesion,
} from '../auth/sesion.js';
import { IdPipe } from '../comun/id.pipe.js';
import {
  type Columna,
  excel,
  EXPORTAN,
  MAX_FILAS_EXCEL,
} from '../comun/excel.js';
import { Pagina } from '../comun/paginacion.js';
import { ConductorDto, FiltroConductoresDto } from './conductor.dto.js';
import type { Conductor } from './conductores.repositorio.js';
import { ConductoresService } from './conductores.service.js';
import { formatearRun } from './run.js';

// Las mismas columnas que la planilla de la versión Laravel.
const COLUMNAS_EXCEL: Columna<Conductor>[] = [
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
@Controller('conductores')
@Roles(...TODOS_LOS_ROLES)
export class ConductoresController {
  constructor(private readonly conductores: ConductoresService) {}

  // Además del tramo pedido, devuelve el resumen de todos los que la cuenta
  // puede ver (sin los filtros).
  @Get()
  listar(
    @Query() q: FiltroConductoresDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<Pagina<Conductor> & { resumen: unknown }> {
    return this.conductores.listar(q, usuario);
  }

  // Planilla con los conductores que cumplen el filtro.
  @Get('excel')
  @Roles(...EXPORTAN)
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
  uno(
    @Param('id', IdPipe) id: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.conductores.buscar(id, usuario);
  }

  @Post()
  @Roles('admin', 'asistente')
  crear(@Body() dto: ConductorDto, @UsuarioActual() usuario: UsuarioSesion) {
    return this.conductores.crear(dto, usuario);
  }

  @Put(':id')
  @Roles('admin', 'asistente')
  editar(
    @Param('id', IdPipe) id: number,
    @Body() dto: ConductorDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.conductores.editar(id, dto, usuario);
  }
}
