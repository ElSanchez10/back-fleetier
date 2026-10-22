// Respuesta de todo listado. `total` cuenta todas las filas que cumplen el
// filtro, no solo las del tramo: así el front sabe si quedan más por pedir.
export interface Pagina<T> {
  items: T[];
  total: number;
}
