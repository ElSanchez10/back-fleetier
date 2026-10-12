import { cifrarClave, claveCorrecta } from './claves.js';

describe('claves', () => {
  it('acepta la contraseña correcta y rechaza otra', async () => {
    const guardada = await cifrarClave('una-clave-larga');
    expect(await claveCorrecta('una-clave-larga', guardada)).toBe(true);
    expect(await claveCorrecta('otra-clave', guardada)).toBe(false);
  });

  it('nunca guarda la contraseña ni repite el resultado', async () => {
    const a = await cifrarClave('misma-clave');
    const b = await cifrarClave('misma-clave');
    expect(a).not.toContain('misma-clave');
    expect(a).not.toBe(b);
  });

  it('rechaza un valor guardado con otro formato', async () => {
    expect(await claveCorrecta('x', 'texto-plano')).toBe(false);
  });
});
