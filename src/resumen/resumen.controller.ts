import { Controller, Get, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import {
  Roles,
  TODOS_LOS_ROLES,
  UsuarioActual,
  type UsuarioSesion,
} from '../auth/sesion.js';
import { type Columna, excel, EXPORTAN } from '../comun/excel.js';
import { ID_MAXIMO } from '../comun/id.pipe.js';
import type { ActividadLocal } from './resumen.repositorio.js';
import { ResumenService } from './resumen.service.js';

export class FiltroActividadLocalesDto {
  // 'AAAA-MM'
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  mes: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  ciudadId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  localId?: number;
}

// Las mismas columnas que la planilla de la versión Laravel.
const COLUMNAS_EXCEL: Columna<ActividadLocal>[] = [
  { titulo: 'Ciudad', valor: (a) => a.ciudad },
  { titulo: 'Local', valor: (a) => a.local },
  {
    titulo: 'Cantidad Ordenes de Pedido',
    valor: (a) => a.ordenes,
    tipo: 'numero',
  },
];

// La pantalla de inicio (las reglas, en ResumenService).
@Controller('resumen')
@Roles(...TODOS_LOS_ROLES)
export class ResumenController {
  constructor(private readonly resumenes: ResumenService) {}

  // Cómo está la operación ahora: rutas abiertas, coolers y conductores.
  @Get()
  resumen(@UsuarioActual() usuario: UsuarioSesion) {
    return this.resumenes.resumen(usuario);
  }

  // Rutas y órdenes de pedido de cada local en un mes. No cuenta las rutas
  // pre-cargadas (en espera): todavía no han salido.
  @Get('locales')
  locales(
    @Query() q: FiltroActividadLocalesDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<ActividadLocal[]> {
    return this.resumenes.actividadLocales(q, usuario);
  }

  @Get('locales/excel')
  @Roles(...EXPORTAN)
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
