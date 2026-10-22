import { leerCookie } from './cookie.util';

describe('leerCookie', () => {
  it('encuentra la cookie entre otras y la decodifica', () => {
    expect(
      leerCookie('a=1; fleetier_sesion=ab%3Dc; b=2', 'fleetier_sesion'),
    ).toBe('ab=c');
  });

  it('sin cabecera o sin esa cookie, null', () => {
    expect(leerCookie(undefined, 'fleetier_sesion')).toBeNull();
    expect(leerCookie('a=1', 'fleetier_sesion')).toBeNull();
  });
});
