import type { Capacidad } from '../enums/capacidad.enum';
import type { Color } from '../enums/color.enum';

// Filas de los catálogos tal como salen de la base.

export interface CiudadRow {
  id: number;
  nombre: string;
}

export interface LocalRow {
  id: number;
  nombre: string;
  direccion: string;
  ciudad_id: number;
  ciudad: string;
}

export interface DestinoRow {
  id: number;
  nombre: string;
  precio_base: number;
}

export interface TipoCoolerRow {
  id: number;
  marca: string;
  capacidad: Capacidad;
  color: Color;
}

export interface TipoConductorRow {
  id: number;
  nombre: string;
}

export interface TipoEventoRow {
  id: number;
  nombre: string;
  color: Color;
}
