import { ForbiddenException } from '@nestjs/common';
import type { UsuarioSesion } from '../interfaces/usuario-sesion.interface';

// Una cuenta con local solo ve y modifica lo de ese local; sin local, todo.

// El local por el que hay que filtrar un listado: el de la cuenta si tiene
// uno (lo que pida se ignora), o el que pidió (null: todos).
export function localVisible(
  usuario: UsuarioSesion,
  pedido?: number | null,
): number | null {
  return usuario.localId ?? pedido ?? null;
}

// Antes de crear o modificar algo de un local: la cuenta debe poder tocarlo.
export function exigirLocal(usuario: UsuarioSesion, localId: number) {
  if (usuario.localId !== null && usuario.localId !== localId) {
    throw new ForbiddenException({ codigo: 'otro_local' });
  }
}
