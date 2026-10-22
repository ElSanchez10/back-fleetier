import { SetMetadata } from '@nestjs/common';
import type { Rol } from '../interfaces/usuario-sesion.interface';

export const TODOS_LOS_ROLES: Rol[] = [
  'admin',
  'asistente',
  'encargado',
  'coordinador',
];

export const META_ROLES = 'roles';

// Roles que pueden usar la ruta. Sin este decorador, una ruta es solo para
// admin: todo lo que no se marque queda cerrado a los demás roles.
export const Roles = (...roles: Rol[]) => SetMetadata(META_ROLES, roles);

// Quienes descargan planillas (en Laravel, todos menos el coordinador).
export const EXPORTAN: Rol[] = ['admin', 'asistente', 'encargado'];
