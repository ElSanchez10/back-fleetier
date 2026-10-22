import { Injectable } from '@nestjs/common';
import type { UsuarioSesion } from '@/common/interfaces/usuario-sesion.interface';
import { localVisible } from '@/common/utils/alcance.util';
import type { FiltroActividadLocalesDto } from './dto/filtro-actividad-locales.query.dto';
import { ResumenRepository } from './repositories/resumen.repository';
import { ActividadLocalResponseDto } from './dto/actividad-local.response.dto';
import { ResumenResponseDto } from './dto/resumen.response.dto';

// Lo que muestra la pantalla de inicio. Una cuenta con local ve solo lo de su
// local (y los conductores de su ciudad).
@Injectable()
export class ResumenService {
  constructor(private readonly datos: ResumenRepository) {}

  // Cómo está la operación ahora: rutas abiertas, coolers y conductores.
  async resumen(usuario: UsuarioSesion): Promise<ResumenResponseDto> {
    const local = localVisible(usuario);
    const [indicadores, coolersPorEstado] = await Promise.all([
      this.datos.indicadores(local),
      this.datos.coolersPorEstado(local),
    ]);
    return ResumenResponseDto.fromRows(indicadores, coolersPorEstado);
  }

  // Rutas y órdenes de pedido de cada local en un mes.
  async actividadLocales(
    q: FiltroActividadLocalesDto,
    usuario: UsuarioSesion,
  ): Promise<ActividadLocalResponseDto[]> {
    const filas = await this.datos.actividadLocales(
      q.mes,
      q.ciudadId ?? null,
      localVisible(usuario, q.localId),
    );
    return filas.map(ActividadLocalResponseDto.fromRow);
  }
}
