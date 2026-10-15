import { NotFoundException } from '@nestjs/common';
import type { Rol } from '../auth/sesion.js';
import type { FiltroRegistrosDto } from './registro.dto.js';

// Condición de día y local de un listado, para la tabla con alias `x`.
// Ocupa $1 (desde), $2 (hasta) y $3 (local); el resto parte en $4.
export const DONDE_COMUN = `
  ($1::date is null or x.fecha >= $1)
  and ($2::date is null or x.fecha <= $2)
  and ($3::int is null or x.local_id = $3)`;

export function filtrosComunes(q: FiltroRegistrosDto, localId: number | null) {
  return [q.fechaDesde ?? null, q.fechaHasta ?? null, localId];
}

export function noExiste(codigo: string): never {
  throw new NotFoundException({ statusCode: 404, codigo });
}

// Encargado y coordinador no ven ni fijan el precio de los pedidos especiales,
// ni los marcan extraordinarios.
export function vePrecios(rol: Rol): boolean {
  return rol === 'admin' || rol === 'asistente';
}
