import { beforeAll, describe, expect, it } from 'vitest';
import { cifrar, descifrar } from './cifrado.js';

describe('cifrado de cuentas', () => {
  beforeAll(() => {
    process.env.CLAVE_CUENTAS = 'secreto-de-prueba-para-vitest';
  });

  it('descifra lo que cifró', () => {
    expect(descifrar(cifrar('clave ñandú 123'))).toBe('clave ñandú 123');
  });

  it('no deja la contraseña a la vista ni repite el resultado', () => {
    const uno = cifrar('secreta');
    expect(uno).not.toContain('secreta');
    expect(cifrar('secreta')).not.toBe(uno);
  });

  it('rechaza un texto cifrado que fue alterado', () => {
    const partes = cifrar('secreta').split('.');
    partes[3] = Buffer.from('otra cosa').toString('base64');
    expect(() => descifrar(partes.join('.'))).toThrow();
  });
});
