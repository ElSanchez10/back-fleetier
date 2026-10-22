import type { Capacidad } from '@/modules/catalogos/enums/capacidad.enum';
import type { Color } from '@/modules/catalogos/enums/color.enum';
import type { EstadoRuta } from '@/modules/rutas/enums/estado-ruta.enum';
import type { EstadoCooler } from '../enums/estado-cooler.enum';

// Filas de los coolers tal como salen de la base.

export interface CoolerRow {
  id: number;
  nombre: string;
  codigo: string;
  fecha_adquisicion: string;
  tiene_tapa: boolean;
  estado: EstadoCooler;
  tipo_cooler_id: number;
  marca: string;
  capacidad: Capacidad;
  color: Color;
  local_id: number;
  local: string;
  ciudad: string;
}

export interface ResumenCoolersRow {
  total: number;
  disponibles: number;
  en_ruta: number;
}

// Una ruta en que estuvo el cooler.
export interface RutaDeCoolerRow {
  id: number;
  fecha: string;
  estado: EstadoRuta;
  local: string;
  conductor_id: number | null;
  conductor: string | null;
  devuelto: boolean;
  devuelto_en: string | null;
}
