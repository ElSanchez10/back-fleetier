import { controladorCon, usuario } from '@/common/testing/pruebas';
import { AuthController } from './auth.controller';
import { AuthService, DURACION_RECORDADA_MS } from './auth.service';

// Lo que el controller hace con la petición y la respuesta: la cookie de
// sesión, la IP y el navegador, y el token de la sesión actual.

const TOKEN = 'token-de-prueba';
const peticion = (cabeceras: Record<string, string> = {}) =>
  ({
    headers: { cookie: `fleetier_sesion=${TOKEN}`, ...cabeceras },
    ip: '::ffff:10.8.0.6',
  }) as never;
const respuesta = () => ({ cookie: vi.fn(), clearCookie: vi.fn() });

describe('AuthController', () => {
  const yo = usuario('admin');
  const servicio = {
    ingresar: vi.fn(() => Promise.resolve({ token: TOKEN, usuario: yo })),
    actualizarPerfil: vi.fn(() => Promise.resolve()),
    sesiones: vi.fn(() => Promise.resolve([])),
    cerrarOtrasSesiones: vi.fn(() => Promise.resolve()),
    eliminarCuenta: vi.fn(() => Promise.resolve()),
    cambiarClave: vi.fn(() => Promise.resolve()),
    salir: vi.fn(() => Promise.resolve()),
  };
  let controller: AuthController;

  beforeEach(async () => {
    vi.clearAllMocks();
    controller = await controladorCon(AuthController, AuthService, servicio);
  });

  it('ingresar deja una cookie HttpOnly bajo /api y anota navegador e IP', async () => {
    const r = respuesta();
    const u = await controller.ingresar(
      { correo: 'a@b.cl', clave: 'x', recordar: true },
      peticion({
        'user-agent': 'Firefox',
        'x-real-ip': '::ffff:10.8.0.9',
        'x-forwarded-proto': 'https',
      }),
      r as never,
    );
    expect(u).toBe(yo);
    expect(servicio.ingresar).toHaveBeenCalledWith('a@b.cl', 'x', true, {
      navegador: 'Firefox',
      ip: '10.8.0.9',
    });
    expect(r.cookie).toHaveBeenCalledWith(
      'fleetier_sesion',
      TOKEN,
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'strict',
        secure: true,
        path: '/api',
        maxAge: DURACION_RECORDADA_MS,
      }),
    );
  });

  it('sin "mantener sesión" la cookie no tiene vencimiento, y sin x-real-ip usa la IP de la conexión', async () => {
    const r = respuesta();
    await controller.ingresar(
      { correo: 'a@b.cl', clave: 'x' },
      peticion(),
      r as never,
    );
    expect(servicio.ingresar).toHaveBeenCalledWith('a@b.cl', 'x', false, {
      navegador: null,
      ip: '10.8.0.6',
    });
    const opciones = (r.cookie.mock.calls[0] as unknown[])[2] as object;
    expect(opciones).not.toHaveProperty('maxAge');
    expect(opciones).toMatchObject({ secure: false });
  });

  it('la cuenta actual y su perfil (el correo queda en minúsculas)', async () => {
    expect(controller.actual(yo)).toBe(yo);
    expect(
      await controller.actualizarPerfil(
        { nombre: 'Ana', correo: 'ANA@B.cl' },
        yo,
      ),
    ).toMatchObject({ nombre: 'Ana', correo: 'ana@b.cl' });
    expect(servicio.actualizarPerfil).toHaveBeenCalledWith(
      yo.id,
      'Ana',
      'ANA@B.cl',
    );
  });

  it('dispositivos, cerrar otras y cambiar la clave usan el token de la sesión', async () => {
    await controller.dispositivos(yo, peticion());
    expect(servicio.sesiones).toHaveBeenCalledWith(yo.id, TOKEN);
    await controller.cerrarOtras({ clave: 'c' }, yo, peticion());
    expect(servicio.cerrarOtrasSesiones).toHaveBeenCalledWith(
      yo.id,
      TOKEN,
      'c',
    );
    await controller.cambiarClave(
      { claveActual: 'a', claveNueva: 'nueva-larga' },
      yo,
      peticion(),
    );
    expect(servicio.cambiarClave).toHaveBeenCalledWith(
      yo.id,
      TOKEN,
      'a',
      'nueva-larga',
    );
  });

  it('salir y eliminar la cuenta borran la cookie', async () => {
    const r = respuesta();
    await controller.salir(peticion(), r as never);
    expect(servicio.salir).toHaveBeenCalledWith(TOKEN);
    expect(r.clearCookie).toHaveBeenCalledWith('fleetier_sesion', {
      path: '/api',
    });
    const r2 = respuesta();
    await controller.eliminarCuenta({ clave: 'c' }, yo, r2 as never);
    expect(servicio.eliminarCuenta).toHaveBeenCalledWith(yo.id, 'c');
    expect(r2.clearCookie).toHaveBeenCalled();
  });
});
