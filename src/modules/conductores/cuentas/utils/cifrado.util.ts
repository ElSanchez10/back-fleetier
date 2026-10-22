import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';

// Cifrado de las contraseñas de las cuentas de un conductor (AES-256-GCM).
// Funciones puras: la llave la entrega CifradoService, que la deriva de
// CLAVE_CUENTAS.

export const LARGO_MINIMO_SECRETO = 16;
const VERSION = 'v1';

// La sal es fija a propósito: el secreto ya es largo y al azar, y la llave
// debe salir igual en cada partida del back. Conserva el nombre de cuando el
// proyecto se llamaba DSL: si cambia, las cuentas ya cifradas no se descifran.
export function derivarLlave(secreto: string): Buffer {
  return scryptSync(secreto, 'dsl-cuentas-conductor', 32);
}

// Devuelve "v1.<iv>.<sello>.<datos>" en base64. El iv es distinto cada vez, así
// que la misma contraseña cifrada dos veces no se ve igual.
export function cifrar(llave: Buffer, texto: string): string {
  const iv = randomBytes(12);
  const cifrador = createCipheriv('aes-256-gcm', llave, iv);
  const datos = Buffer.concat([
    cifrador.update(texto, 'utf8'),
    cifrador.final(),
  ]);
  return [VERSION, iv, cifrador.getAuthTag(), datos]
    .map((parte) =>
      typeof parte === 'string' ? parte : parte.toString('base64'),
    )
    .join('.');
}

export function descifrar(llave: Buffer, cifrado: string): string {
  const [version, iv, sello, datos] = cifrado.split('.');
  if (version !== VERSION || !iv || !sello || datos === undefined) {
    throw new Error('Formato de cifrado desconocido');
  }
  const descifrador = createDecipheriv(
    'aes-256-gcm',
    llave,
    Buffer.from(iv, 'base64'),
  );
  descifrador.setAuthTag(Buffer.from(sello, 'base64'));
  return Buffer.concat([
    descifrador.update(Buffer.from(datos, 'base64')),
    descifrador.final(),
  ]).toString('utf8');
}
