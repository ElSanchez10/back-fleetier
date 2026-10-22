import type { Color } from '@/modules/catalogos/enums/color.enum';
import type { EstadoCooler } from '@/modules/coolers/enums/estado-cooler.enum';
import type { EstadoRuta } from '../enums/estado-ruta.enum';

// Filas de las rutas tal como salen de la base.

// Una ruta con su local, su conductor y cuántos coolers y problemas tiene.
export interface RutaRow {
  id: number;
  // Hora de Chile, 'AAAA-MM-DDTHH:MM'.
  fecha: string;
  ordenes: number;
  estado: EstadoRuta;
  local_id: number;
  local: string;
  ciudad_id: number;
  ciudad: string;
  conductor_id: number | null;
  conductor: string | null;
  conductor_telefono: string | null;
  conductor_tipo_id: number | null;
  coolers: number;
  devueltos: number;
  problemas: number;
}

// Cuántas rutas de hoy hay en cada estado.
export interface ResumenRutasHoyRow {
  fecha: string;
  en_espera: number;
  en_ejecucion: number;
  pendientes: number;
  finalizadas: number;
}

// Un cooler de la ruta, para su detalle.
export interface CoolerDeRutaRow {
  id: number;
  nombre: string;
  codigo: string;
  estado: EstadoCooler;
  color: Color;
  devuelto: boolean;
  devuelto_en: string | null;
}

// Lo que OperacionesService lee (y bloquea) para decidir.
export interface RutaBloqueadaRow {
  id: number;
  local_id: number;
  conductor_id: number | null;
  estado: EstadoRuta;
}

export interface CoolerDeRutaBloqueadoRow {
  cooler_id: number;
  devuelto: boolean;
}

export interface RutaDelCoolerRow {
  id: number;
  estado: EstadoRuta;
}
