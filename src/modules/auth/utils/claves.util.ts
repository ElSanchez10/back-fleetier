import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derivar = promisify(scrypt) as (
  clave: string,
  sal: Buffer,
  largo: number,
) => Promise<Buffer>;
const LARGO = 64;

// Cifra una contraseña para guardarla. El resultado lleva su propia sal:
// "scrypt$<sal>$<hash>", ambos en base64url.
export async function cifrarClave(clave: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await derivar(clave, sal, LARGO);
  return `scrypt$${sal.toString('base64url')}$${hash.toString('base64url')}`;
}

// Comprueba una contraseña contra lo guardado por cifrarClave().
export async function claveCorrecta(
  clave: string,
  guardada: string,
): Promise<boolean> {
  const [esquema, sal, hash] = guardada.split('$');
  if (esquema !== 'scrypt' || !sal || !hash) {
    return false;
  }
  const esperado = Buffer.from(hash, 'base64url');
  const obtenido = await derivar(
    clave,
    Buffer.from(sal, 'base64url'),
    esperado.length,
  );
  return timingSafeEqual(esperado, obtenido);
}
