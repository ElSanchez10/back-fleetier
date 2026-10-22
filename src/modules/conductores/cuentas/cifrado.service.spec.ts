import { configFalsa, codigoDe } from '@/common/testing/pruebas';
import { CifradoService } from './cifrado.service';

describe('CifradoService', () => {
  it('cifra y descifra con la llave de CLAVE_CUENTAS', () => {
    const s = new CifradoService(
      configFalsa({ CLAVE_CUENTAS: 'secreto-de-prueba-para-vitest' }),
    );
    expect(s.descifrar(s.cifrar('hola'))).toBe('hola');
  });

  it('sin CLAVE_CUENTAS responde 503 al usarlo, pero se puede crear', async () => {
    const s = new CifradoService(configFalsa({}));
    expect(await codigoDe(Promise.resolve().then(() => s.cifrar('x')))).toBe(
      'cifrado_no_configurado',
    );
  });
});
