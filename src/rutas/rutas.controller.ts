import {
  Body,
  Controller,
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
import { Pagina } from '../comun/paginacion.js';
import {
  type Columna,
  excel,
  EXPORTAN,
  MAX_FILAS_EXCEL,
} from '../comun/excel.js';
import { hoyEnChile } from '../comun/validaciones.js';
import {
  FiltroRutasDto,
  NOMBRE_ESTADO_RUTA,
  NuevaRutaDto,
  RutaDto,
} from './ruta.dto.js';
import { RutasService } from './rutas.service.js';
import type { Ruta } from './rutas.sql.js';

// Las mismas columnas que la planilla de la versión Laravel.
const COLUMNAS_EXCEL: Columna<Ruta>[] = [
  { titulo: 'Identificador', valor: (r) => r.id },
  { titulo: 'Fecha', valor: (r) => r.fecha, tipo: 'fechaHora' },
  {
    titulo: 'Cantidad Ordenes de Pedido',
    valor: (r) => r.ordenes,
    tipo: 'numero',
  },
  { titulo: 'Local', valor: (r) => r.local },
  { titulo: 'Ciudad', valor: (r) => r.ciudad },
  { titulo: 'Estado Ruta', valor: (r) => NOMBRE_ESTADO_RUTA[r.estado] },
  { titulo: 'Conductor', valor: (r) => r.conductor },
];

// Rutas de reparto (las reglas, en RutasService). Todos los roles las ven; las
// operan admin, encargado y coordinador.
@Controller('rutas')
@Roles('admin', 'encargado', 'coordinador')
export class RutasController {
  constructor(private readonly rutas: RutasService) {}

  @Get()
  @Roles(...TODOS_LOS_ROLES)
  listar(
    @Query() q: FiltroRutasDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<Pagina<Ruta>> {
    return this.rutas.listar(q, usuario);
  }

  // Cuántas rutas de hoy hay en cada estado.
  @Get('resumen')
  @Roles(...TODOS_LOS_ROLES)
  resumen(@UsuarioActual() usuario: UsuarioSesion) {
    return this.rutas.resumenDeHoy(usuario);
  }

  // Planilla con las rutas que cumplen el filtro (todas, no un tramo).
  @Get('excel')
  @Roles(...EXPORTAN)
  async excel(
    @Query() q: FiltroRutasDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    const rutas = await this.rutas.todas(q, usuario, MAX_FILAS_EXCEL);
    const [anio, mes, dia] = hoyEnChile().split('-');
    return excel(
      'Historial Rutas',
      `Rutas al ${dia}-${mes}-${anio}`,
      COLUMNAS_EXCEL,
      rutas,
    );
  }

  // La ruta con sus coolers y sus problemas.
  @Get(':id')
  @Roles(...TODOS_LOS_ROLES)
  uno(
    @Param('id', IdPipe) id: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.rutas.detalle(id, usuario);
  }

  @Post()
  crear(@Body() dto: NuevaRutaDto, @UsuarioActual() usuario: UsuarioSesion) {
    return this.rutas.crear(dto, usuario);
  }

  @Put(':id')
  editar(
    @Param('id', IdPipe) id: number,
    @Body() dto: RutaDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.rutas.editar(id, dto, usuario);
  }

  @Post(':id/iniciar')
  @HttpCode(200)
  iniciar(
    @Param('id', IdPipe) id: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.rutas.iniciar(id, usuario);
  }

  @Post(':id/cerrar')
  @HttpCode(200)
  cerrar(
    @Param('id', IdPipe) id: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.rutas.cerrar(id, usuario);
  }
}
