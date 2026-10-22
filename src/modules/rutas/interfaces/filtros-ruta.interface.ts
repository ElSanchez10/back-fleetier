import type { EstadoRuta } from '../enums/estado-ruta.enum';

// Lo que filtra el listado y la planilla de rutas. `localId` null: todos.
export interface FiltrosRuta {
  buscar?: string;
  // El número de ruta, si lo buscado es un número.
  numero: number | null;
  fechaDesde: string | null;
  fechaHasta: string | null;
  estado: EstadoRuta | null;
  localId: number | null;
}
