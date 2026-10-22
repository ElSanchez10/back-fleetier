import type { EstadoRuta } from '@/modules/rutas/enums/estado-ruta.enum';

// Filas de los conductores tal como salen de la base.

export interface ConductorRow {
  id: number;
  nombre: string;
  run: string;
  fecha_nacimiento: string;
  telefono: string;
  email: string;
  ciudad_id: number;
  ciudad: string;
  tipo_conductor_id: number;
  tipo_conductor: string;
  ocupado: boolean;
  // Objeto JSON armado en el SQL (json_build_object).
  ultima_ruta: {
    id: number;
    fecha: string;
    estado: EstadoRuta;
    local: string;
    ciudad: string;
  } | null;
}

export interface ResumenConductoresRow {
  total: number;
  disponibles: number;
  en_ruta: number;
}

export interface RutaDeConductorRow {
  id: number;
  fecha: string;
  ordenes: number;
  estado: EstadoRuta;
  local: string;
}

export interface ActividadEnLocalRow {
  local: string;
  ciudad: string;
  rutas: number;
  ordenes: number;
}
