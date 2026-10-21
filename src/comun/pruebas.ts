// Apoyo para las pruebas (*.spec.ts): datos emulados, sin base de datos. No
// entra en el build (tsconfig.build.json).
import type { Rol, UsuarioSesion } from '../auth/sesion.js';
import type { BdService, Consultar } from '../bd/bd.service.js';

// Una consulta que nunca se usa: los repositorios de las pruebas son falsos.
export const sqlFalso = (() => Promise.resolve([])) as unknown as Consultar;

// Un BdService cuya transacción solo ejecuta el trabajo.
export const bdFalsa = {
  consultar: sqlFalso,
  transaccion: <R>(trabajo: (sql: Consultar) => Promise<R>) =>
    trabajo(sqlFalso),
} as unknown as BdService;

export function usuario(
  rol: Rol,
  localId: number | null = null,
): UsuarioSesion {
  return {
    id: 1,
    nombre: 'Prueba',
    correo: 'p@p.cl',
    rol,
    debeCambiarClave: false,
    localId,
  };
}

// El `codigo` del error que lanzó la promesa, o 'sin error'.
export async function codigoDe(promesa: Promise<unknown>): Promise<string> {
  try {
    await promesa;
    return 'sin error';
  } catch (error) {
    const e = error as { getResponse?: () => { codigo?: string } };
    return e.getResponse?.().codigo ?? String(error);
  }
}
