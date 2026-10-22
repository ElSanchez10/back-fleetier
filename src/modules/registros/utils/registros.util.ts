import { NotFoundException } from '@nestjs/common';
import type { Rol } from '@/common/interfaces/usuario-sesion.interface';

export function noExiste(codigo: string): never {
  throw new NotFoundException({ codigo });
}

// Encargado y coordinador no ven ni fijan el precio de los pedidos especiales,
// ni los marcan extraordinarios.
export function vePrecios(rol: Rol): boolean {
  return rol === 'admin' || rol === 'asistente';
}
