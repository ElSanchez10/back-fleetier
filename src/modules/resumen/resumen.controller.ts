import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
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
import { type Columna, excel } from '@/common/utils/excel.util';
import { FiltroActividadLocalesDto } from './dto/filtro-actividad-locales.query.dto';
import { ActividadLocalResponseDto } from './dto/actividad-local.response.dto';
import { ResumenResponseDto } from './dto/resumen.response.dto';
import { ResumenService } from './resumen.service';

// Las mismas columnas que la planilla de la versión Laravel.
const COLUMNAS_EXCEL: Columna<ActividadLocalResponseDto>[] = [
  { titulo: 'Ciudad', valor: (a) => a.ciudad },
  { titulo: 'Local', valor: (a) => a.local },
  {
    titulo: 'Cantidad Ordenes de Pedido',
    valor: (a) => a.ordenes,
    tipo: 'numero',
  },
];

// La pantalla de inicio (las reglas, en ResumenService).
@ApiTags('Resumen')
@ApiSesion()
@Controller('resumen')
@Roles(...TODOS_LOS_ROLES)
export class ResumenController {
  constructor(private readonly resumenes: ResumenService) {}

  // Cómo está la operación ahora: rutas abiertas, coolers y conductores.
  @Get()
  @ApiOperation({
    summary: 'Indicadores de la pantalla de inicio, en lo que la cuenta ve',
  })
  @ApiOkResponse({ type: ResumenResponseDto })
  resumen(
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<ResumenResponseDto> {
    return this.resumenes.resumen(usuario);
  }

  // Rutas y órdenes de pedido de cada local en un mes. No cuenta las rutas
  // pre-cargadas (en espera): todavía no han salido.
  @Get('locales')
  @ApiOperation({ summary: 'Rutas y órdenes de cada local en un mes' })
  @ApiOkResponse({ type: [ActividadLocalResponseDto] })
  @ApiErrores(400)
  locales(
    @Query() q: FiltroActividadLocalesDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<ActividadLocalResponseDto[]> {
    return this.resumenes.actividadLocales(q, usuario);
  }

  @Get('locales/excel')
  @Roles(...EXPORTAN)
  @ApiOperation({ summary: 'La misma actividad por local, como planilla' })
  @ApiArchivo(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Planilla Excel',
  )
  @ApiErrores(400)
  async localesExcel(
    @Query() q: FiltroActividadLocalesDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    const [anio, mes] = q.mes.split('-');
    return excel(
      'Historial Actividad por Local',
      `Act. Locales periodo ${mes}-${anio}`,
      COLUMNAS_EXCEL,
      await this.resumenes.actividadLocales(q, usuario),
    );
  }
}
