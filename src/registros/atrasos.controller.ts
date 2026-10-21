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
import type { Atraso } from './atrasos.repositorio.js';
import { AtrasosService } from './atrasos.service.js';
import { AtrasoDto, FiltroAtrasosDto } from './registro.dto.js';

const NOMBRE_PLANILLA = 'Historial Atrasos';
const NOMBRE_HOJA = 'Atrasos';

// Las mismas columnas que la planilla de la versión Laravel.
const COLUMNAS_EXCEL: Columna<Atraso>[] = [
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
@Controller('atrasos')
@Roles('admin', 'encargado', 'coordinador')
export class AtrasosController {
  constructor(private readonly atrasos: AtrasosService) {}

  @Get()
  @Roles(...TODOS_LOS_ROLES)
  listar(
    @Query() q: FiltroAtrasosDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<Pagina<Atraso>> {
    return this.atrasos.listar(q, usuario);
  }

  @Get('excel')
  @Roles(...EXPORTAN)
  async excel(
    @Query() q: FiltroAtrasosDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    const filas = await this.atrasos.todos(q, usuario, MAX_FILAS_EXCEL);
    return excel(NOMBRE_PLANILLA, NOMBRE_HOJA, COLUMNAS_EXCEL, filas);
  }

  @Post()
  crear(@Body() dto: AtrasoDto, @UsuarioActual() usuario: UsuarioSesion) {
    return this.atrasos.crear(dto, usuario);
  }

  @Put(':id')
  editar(
    @Param('id', IdPipe) id: number,
    @Body() dto: AtrasoDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.atrasos.editar(id, dto, usuario);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(204)
  eliminar(@Param('id', IdPipe) id: number) {
    return this.atrasos.eliminar(id);
  }
}
