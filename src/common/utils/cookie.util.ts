export const COOKIE_SESION = 'dsl_sesion';

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
