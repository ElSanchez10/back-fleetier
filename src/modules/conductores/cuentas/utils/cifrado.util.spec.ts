import { cifrar, derivarLlave, descifrar } from './cifrado.util';

const LLAVE = derivarLlave('secreto-de-prueba-para-vitest');

describe('cifrado de cuentas', () => {
  it('descifra lo que cifró', () => {
    expect(descifrar(LLAVE, cifrar(LLAVE, 'clave ñandú 123'))).toBe(
      'clave ñandú 123',
    );
  });

  it('no deja la contraseña a la vista ni repite el resultado', () => {
    const uno = cifrar(LLAVE, 'secreta');
    expect(uno).not.toContain('secreta');
    expect(cifrar(LLAVE, 'secreta')).not.toBe(uno);
  });

  it('rechaza un texto cifrado que fue alterado', () => {
    const partes = cifrar(LLAVE, 'secreta').split('.');
    partes[3] = Buffer.from('otra cosa').toString('base64');
    expect(() => descifrar(LLAVE, partes.join('.'))).toThrow();
  });

  it('con otra llave no se puede leer', () => {
    const cifrada = cifrar(LLAVE, 'secreta');
    expect(() =>
      descifrar(derivarLlave('otro-secreto-cualquiera'), cifrada),
    ).toThrow();
  });

  it('la misma llave sale igual en cada partida', () => {
    expect(derivarLlave('abc').equals(derivarLlave('abc'))).toBe(true);
  });
});
