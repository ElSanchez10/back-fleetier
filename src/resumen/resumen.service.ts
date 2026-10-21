import { Injectable } from '@nestjs/common';
import type { UsuarioSesion } from '../auth/sesion.js';
import { localVisible } from '../comun/alcance.js';
import { ResumenRepositorio } from './resumen.repositorio.js';
import type { FiltroActividadLocalesDto } from './resumen.controller.js';

// Lo que muestra la pantalla de inicio. Una cuenta con local ve solo lo de su
// local (y los conductores de su ciudad).
@Injectable()
export class ResumenService {
  constructor(private readonly datos: ResumenRepositorio) {}

  // Cómo está la operación ahora: rutas abiertas, coolers y conductores.
  async resumen(usuario: UsuarioSesion) {
    const local = localVisible(usuario);
    const [indicadores, coolersPorEstado] = await Promise.all([
      this.datos.indicadores(local),
      this.datos.coolersPorEstado(local),
    ]);
    return { ...indicadores, coolersPorEstado };
  }

  // Rutas y órdenes de pedido de cada local en un mes.
  actividadLocales(q: FiltroActividadLocalesDto, usuario: UsuarioSesion) {
    return this.datos.actividadLocales(
      q.mes,
      q.ciudadId ?? null,
      localVisible(usuario, q.localId),
    );
  }
}
