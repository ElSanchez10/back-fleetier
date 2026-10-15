import type { Sentido } from './paginacion.js';

// Arma la parte "set col = $n, ..." de un update solo con los campos que llegaron
// en el DTO. `columnas` traduce cada campo del DTO a su columna en la tabla.
// Los parámetros empiezan en $2: el $1 queda para el id del where.
export function asignaciones<T extends object>(
  dto: T,
  columnas: Record<keyof T, string>,
): { set: string; valores: unknown[] } | null {
  const campos = (Object.keys(columnas) as (keyof T)[]).filter(
    (campo) => dto[campo] !== undefined,
  );
  if (campos.length === 0) {
    return null;
  }
  return {
    set: campos.map((campo, i) => `${columnas[campo]} = $${i + 2}`).join(', '),
    valores: campos.map((campo) => dto[campo]),
  };
}

// Condición SQL "la columna contiene el texto", sin distinguir mayúsculas ni
// tildes (extensión unaccent). El parámetro debe ser el resultado de patron().
export function contiene(columna: string, parametro: string): string {
  return `unaccent(lower(${columna})) like unaccent(lower(${parametro}))`;
}

// Patrón de like para un texto escrito por el usuario: % y _ se toman literales.
// Sin texto, el patrón '%' deja pasar todo.
export function patron(buscar?: string): string {
  return buscar ? `%${buscar.replace(/[\\%_]/g, '\\$&')}%` : '%';
}

// "Hoy" es el día en Chile, no el del servidor (que corre en UTC).
export const HOY = `(now() at time zone 'America/Santiago')::date`;

// `order by` de un listado. `columnas` dice por cuáles se puede ordenar (el
// nombre que usa el front y su expresión SQL); un `orden` que no está ahí se
// ignora y queda el orden por defecto. El id desempata, para que las páginas
// no repitan ni salten filas.
export function ordenarPor(
  q: { orden?: string; sentido?: Sentido },
  columnas: Record<string, string>,
  porDefecto: string,
  id: string,
): string {
  if (!q.orden || !Object.hasOwn(columnas, q.orden)) {
    return `order by ${porDefecto}`;
  }
  const sentido = q.sentido ?? 'asc';
  return `order by ${columnas[q.orden]} ${sentido}, ${id} ${sentido}`;
}
