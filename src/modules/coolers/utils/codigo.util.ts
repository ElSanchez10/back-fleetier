import { randomInt } from 'node:crypto';

// Ocho dígitos al azar: cortos de leer y de escribir a mano.
export function codigoAlAzar(): string {
  return String(randomInt(0, 100_000_000)).padStart(8, '0');
}
