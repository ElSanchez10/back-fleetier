import { ServiceUnavailableException } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';

// Cifrado de las contraseñas de las cuentas de un conductor (AES-256-GCM).
// La llave sale de la variable CLAVE_CUENTAS, que vive solo en el .env del
// servidor: con la base o un respaldo, sin esa variable, no se pueden leer.
// Si CLAVE_CUENTAS cambia o se pierde, lo ya guardado queda ilegible.

const LARGO_MINIMO = 16;
const VERSION = 'v1';
let llave: Buffer | null | undefined;

function obtenerLlave(): Buffer {
  if (llave === undefined) {
    const secreto = process.env.CLAVE_CUENTAS ?? '';
    // La sal es fija a propósito: el secreto ya es largo y al azar, y la llave
    // debe salir igual en cada partida del back.
    llave =
      secreto.length >= LARGO_MINIMO
        ? scryptSync(secreto, 'dsl-cuentas-conductor', 32)
        : null;
  }
  if (!llave) {
    throw new ServiceUnavailableException({
      statusCode: 503,
      codigo: 'cifrado_no_configurado',
    });
  }
  return llave;
}

export function cifradoConfigurado(): boolean {
  return (process.env.CLAVE_CUENTAS ?? '').length >= LARGO_MINIMO;
}

// Devuelve "v1.<iv>.<sello>.<datos>" en base64. El iv es distinto cada vez, así
// que la misma contraseña cifrada dos veces no se ve igual.
export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const cifrador = createCipheriv('aes-256-gcm', obtenerLlave(), iv);
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

export function descifrar(cifrado: string): string {
  const [version, iv, sello, datos] = cifrado.split('.');
  if (version !== VERSION || !iv || !sello || datos === undefined) {
    throw new Error('Formato de cifrado desconocido');
  }
  const descifrador = createDecipheriv(
    'aes-256-gcm',
    obtenerLlave(),
    Buffer.from(iv, 'base64'),
  );
  descifrador.setAuthTag(Buffer.from(sello, 'base64'));
  return Buffer.concat([
    descifrador.update(Buffer.from(datos, 'base64')),
    descifrador.final(),
  ]).toString('utf8');
}
