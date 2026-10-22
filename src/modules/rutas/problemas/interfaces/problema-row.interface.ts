// Un problema de una ruta tal como sale de la base.
export interface ProblemaRow {
  id: number;
  cantidad: number;
  descripcion: string;
  // Hora de Chile, 'AAAA-MM-DDTHH:MM'.
  creado_en: string;
}
