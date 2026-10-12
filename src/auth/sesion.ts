import {
  SetMetadata,
  createParamDecorator,
  type ExecutionContext,
} from '@nestjs/common';

export type Rol = 'admin' | 'asistente' | 'encargado' | 'coordinador';

export const TODOS_LOS_ROLES: Rol[] = [
  'admin',
  'asistente',
  'encargado',
  'coordinador',
];

// Quien hizo la petición, según su sesión.
export interface UsuarioSesion {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
  // true mientras tenga la contraseña inicial: solo puede cambiarla o salir.
  debeCambiarClave: boolean;
  // Su local. Con un local, solo ve y modifica lo de ese local; null: ve todos.
  localId: number | null;
}

export const COOKIE_SESION = 'dsl_sesion';

export const META_PUBLICO = 'publico';
export const META_ROLES = 'roles';
export const META_CON_CLAVE_INICIAL = 'conClaveInicial';

// Ruta que no exige sesión.
export const Publico = () => SetMetadata(META_PUBLICO, true);

// Roles que pueden usar la ruta. Sin este decorador, una ruta es solo para
// admin: todo lo que no se marque queda cerrado a los demás roles.
export const Roles = (...roles: Rol[]) => SetMetadata(META_ROLES, roles);

// Ruta que se puede usar aunque la cuenta aún tenga la contraseña inicial.
export const ConClaveInicial = () => SetMetadata(META_CON_CLAVE_INICIAL, true);

// Inyecta en un parámetro al usuario de la sesión.
export const UsuarioActual = createParamDecorator(
  (_: unknown, contexto: ExecutionContext) =>
    contexto.switchToHttp().getRequest<{ usuario: UsuarioSesion }>().usuario,
);

// Valor de una cookie en la cabecera "Cookie" de una petición.
export function leerCookie(
  cabecera: string | undefined,
  nombre: string,
): string | null {
  for (const parte of (cabecera ?? '').split(';')) {
    const [clave, ...valor] = parte.trim().split('=');
    if (clave === nombre) {
      return decodeURIComponent(valor.join('='));
    }
  }
  return null;
}
