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
  ApiCreatedResponse,
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
import { DetalleRutaResponseDto } from './dto/detalle-ruta.response.dto';
import { ResumenRutasHoyResponseDto } from './dto/resumen-rutas.response.dto';
import { RutaResponseDto } from './dto/ruta.response.dto';
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
import { hoyEnChile } from '@/common/utils/validaciones.util';
import { FiltroRutasDto } from './dto/filtro-rutas.query.dto';
import { NuevaRutaDto } from './dto/nueva-ruta.request.dto';
import { RutaDto } from './dto/ruta.request.dto';
import { NOMBRE_ESTADO_RUTA } from './enums/estado-ruta.enum';
import { RutasService } from './rutas.service';

// Las mismas columnas que la planilla de la versión Laravel.
const COLUMNAS_EXCEL: Columna<RutaResponseDto>[] = [
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
@ApiTags('Rutas')
@ApiSesion()
@Controller('rutas')
@Roles('admin', 'encargado', 'coordinador')
export class RutasController {
  constructor(private readonly rutas: RutasService) {}

  @Get()
  @Roles(...TODOS_LOS_ROLES)
  @ApiOperation({ summary: 'El historial de rutas que la cuenta ve' })
  @ApiPaginaResponse(RutaResponseDto)
  @ApiErrores(400)
  listar(
    @Query() q: FiltroRutasDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<Pagina<RutaResponseDto>> {
    return this.rutas.listar(q, usuario);
  }

  // Cuántas rutas de hoy hay en cada estado.
  @Get('resumen')
  @Roles(...TODOS_LOS_ROLES)
  @ApiOperation({ summary: 'Cuántas rutas de hoy hay en cada estado' })
  @ApiOkResponse({ type: ResumenRutasHoyResponseDto })
  resumen(
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<ResumenRutasHoyResponseDto> {
    return this.rutas.resumenDeHoy(usuario);
  }

  // Planilla con las rutas que cumplen el filtro (todas, no un tramo).
  @Get('excel')
  @Roles(...EXPORTAN)
  @ApiOperation({ summary: 'Planilla con las rutas que cumplen el filtro' })
  @ApiArchivo(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Planilla Excel',
  )
  @ApiErrores(400)
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
  @ApiOperation({ summary: 'La ruta con sus coolers y sus problemas' })
  @ApiOkResponse({ type: DetalleRutaResponseDto })
  @ApiErrores(404)
  uno(
    @Param('id', IdPipe) id: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<DetalleRutaResponseDto> {
    return this.rutas.detalle(id, usuario);
  }

  @Post()
  @ApiOperation({
    summary: 'Registra una ruta: en espera o, con `iniciar`, ya en ejecución',
  })
  @ApiCreatedResponse({ type: DetalleRutaResponseDto })
  @ApiErrores(400, 404, 409)
  crear(
    @Body() dto: NuevaRutaDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<DetalleRutaResponseDto> {
    return this.rutas.crear(dto, usuario);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Corrige la ruta y sus coolers; si ya partió, solo un admin',
  })
  @ApiOkResponse({ type: DetalleRutaResponseDto })
  @ApiErrores(400, 404, 409)
  editar(
    @Param('id', IdPipe) id: number,
    @Body() dto: RutaDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<DetalleRutaResponseDto> {
    return this.rutas.editar(id, dto, usuario);
  }

  @Post(':id/iniciar')
  @HttpCode(200)
  @ApiOperation({ summary: 'La ruta parte: sus coolers quedan en ruta' })
  @ApiOkResponse({ type: DetalleRutaResponseDto })
  @ApiErrores(404, 409)
  iniciar(
    @Param('id', IdPipe) id: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<DetalleRutaResponseDto> {
    return this.rutas.iniciar(id, usuario);
  }

  @Post(':id/cerrar')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Cierra la ruta: finalizada si volvieron todos sus coolers; si no, pendiente',
  })
  @ApiOkResponse({ type: DetalleRutaResponseDto })
  @ApiErrores(404, 409)
  cerrar(
    @Param('id', IdPipe) id: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<DetalleRutaResponseDto> {
    return this.rutas.cerrar(id, usuario);
  }
}
