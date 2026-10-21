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
import type { Caso } from './casos.repositorio.js';
import { CasosService } from './casos.service.js';
import { CasoDto, FiltroRegistrosDto } from './registro.dto.js';

const NOMBRE_PLANILLA = 'Historial Casos';
const NOMBRE_HOJA = 'Casos';

// Las mismas columnas que la planilla de la versión Laravel.
const COLUMNAS_EXCEL: Columna<Caso>[] = [
  { titulo: 'Identificador', valor: (c) => c.id },
  { titulo: 'Fecha', valor: (c) => c.fecha, tipo: 'fecha' },
  { titulo: 'Local', valor: (c) => c.local },
  { titulo: 'Ciudad', valor: (c) => c.ciudad },
  { titulo: 'Conductor', valor: (c) => c.conductor },
  { titulo: 'Descripción', valor: (c) => c.descripcion },
];

// Casos excepcionales de un conductor en un local. Todos los roles los ven;
// los anotan y corrigen admin, encargado y coordinador, y los elimina solo admin.
@Controller('casos')
@Roles('admin', 'encargado', 'coordinador')
export class CasosController {
  constructor(private readonly casos: CasosService) {}

  @Get()
  @Roles(...TODOS_LOS_ROLES)
  listar(
    @Query() q: FiltroRegistrosDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<Pagina<Caso>> {
    return this.casos.listar(q, usuario);
  }

  @Get('excel')
  @Roles(...EXPORTAN)
  async excel(
    @Query() q: FiltroRegistrosDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    const filas = await this.casos.todos(q, usuario, MAX_FILAS_EXCEL);
    return excel(NOMBRE_PLANILLA, NOMBRE_HOJA, COLUMNAS_EXCEL, filas);
  }

  @Post()
  crear(@Body() dto: CasoDto, @UsuarioActual() usuario: UsuarioSesion) {
    return this.casos.crear(dto, usuario);
  }

  @Put(':id')
  editar(
    @Param('id', IdPipe) id: number,
    @Body() dto: CasoDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.casos.editar(id, dto, usuario);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(204)
  eliminar(@Param('id', IdPipe) id: number) {
    return this.casos.eliminar(id);
  }
}
