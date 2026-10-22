import type { EstadoCooler } from '@/modules/coolers/enums/estado-cooler.enum';

// Filas de la pantalla de inicio tal como salen de la base.

export interface IndicadoresRow {
  rutas_activas: number;
  rutas_pendientes: number;
  coolers_disponibles: number;
  conductores_en_ruta: number;
}

export interface CoolersPorEstadoRow {
  estado: EstadoCooler;
  cantidad: number;
}

export interface ActividadLocalRow {
  local_id: number;
  local: string;
  ciudad: string;
  rutas: number;
  ordenes: number;
}
