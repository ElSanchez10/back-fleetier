import { bdFalsa, codigoDe, configFalsa } from '@/common/testing/pruebas';
import { AuthService, DURACION_RECORDADA_MS } from './auth.service';
import type { AuthRepository } from './repositories/auth.repository';
import { cifrarClave } from './utils/claves.util';

// Ingreso, sesiones y contraseñas con un repositorio emulado.

const DISPOSITIVO = { navegador: 'Chrome', ip: '10.0.0.1' };
const USUARIO = {
  id: 1,
  nombre: 'Ana',
  correo: 'ana@fleetier.cl',
  rol: 'admin' as const,
  debeCambiarClave: false,
  localId: null,
};

async function armar(fallos = 0) {
  const claveHash = await cifrarClave('la-clave-buena');
  const datos = {
    fallosRecientes: vi.fn(() => Promise.resolve(fallos)),
    cuentaPorCorreo: vi.fn((correo: string) =>
      Promise.resolve(
        correo === 'ana@fleetier.cl'
          ? { id: 1, clave_hash: claveHash }
          : undefined,
      ),
    ),
    claveHash: vi.fn(() => Promise.resolve(claveHash)),
    anotarFallo: vi.fn(() => Promise.resolve()),
    olvidarFallos: vi.fn(() => Promise.resolve()),
    abrirSesion: vi.fn(() => Promise.resolve()),
    borrarSesionesVencidas: vi.fn(() => Promise.resolve()),
    usuarioDeSesion: vi.fn(() =>
      Promise.resolve({
        id: USUARIO.id,
        nombre: USUARIO.nombre,
        email: USUARIO.correo,
        rol: USUARIO.rol,
        debe_cambiar_clave: USUARIO.debeCambiarClave,
        local_id: USUARIO.localId,
      }),
    ),
    guardarClave: vi.fn(() => Promise.resolve(true)),
    cerrarSesiones: vi.fn(() => Promise.resolve()),
    eliminarSiQuedaOtroAdmin: vi.fn(() => Promise.resolve(false)),
  };
  const servicio = new AuthService(
    bdFalsa,
    datos as unknown as AuthRepository,
    configFalsa({ CLAVE_INICIAL: 'clave-inicial-123' }),
  );
  return { datos, servicio };
}

describe('AuthService.ingresar', () => {
  it('con la contraseña correcta abre una sesión y olvida los fallos', async () => {
    const { servicio, datos } = await armar();
    const { token, usuario } = await servicio.ingresar(
      'ANA@fleetier.cl',
      'la-clave-buena',
      true,
      DISPOSITIVO,
    );
    expect(usuario.id).toBe(1);
    expect(token.length).toBeGreaterThan(30);
    expect(datos.olvidarFallos).toHaveBeenCalledWith('ana@fleetier.cl');
    const [usuarioId, huella, duracion] = datos.abrirSesion.mock
      .calls[0] as unknown[];
    expect(usuarioId).toBe(1);
    expect(huella).not.toBe(token);
    expect(duracion).toBe(DURACION_RECORDADA_MS);
  });

  it('mismo error si el correo no existe o la contraseña no calza, y anota el fallo', async () => {
    const { servicio, datos } = await armar();
    expect(
      await codigoDe(
        servicio.ingresar('ana@fleetier.cl', 'otra', false, DISPOSITIVO),
      ),
    ).toBe('credenciales_invalidas');
    expect(
      await codigoDe(
        servicio.ingresar('nadie@fleetier.cl', 'otra', false, DISPOSITIVO),
      ),
    ).toBe('credenciales_invalidas');
    expect(datos.anotarFallo).toHaveBeenCalledTimes(2);
    expect(datos.abrirSesion).not.toHaveBeenCalled();
  });

  it('después de cinco fallos se bloquea, aunque la contraseña sea correcta', async () => {
    const { servicio, datos } = await armar(5);
    expect(
      await codigoDe(
        servicio.ingresar(
          'ana@fleetier.cl',
          'la-clave-buena',
          false,
          DISPOSITIVO,
        ),
      ),
    ).toBe('demasiados_intentos');
    expect(datos.abrirSesion).not.toHaveBeenCalled();
  });
});

describe('AuthService: contraseña y cuenta', () => {
  it('cambiar: pide la actual, y la nueva no puede ser la inicial ni la misma', async () => {
    const { servicio, datos } = await armar();
    expect(
      await codigoDe(servicio.cambiarClave(1, 't', 'mala', 'nueva-larga-1')),
    ).toBe('clave_actual_incorrecta');
    expect(
      await codigoDe(
        servicio.cambiarClave(1, 't', 'la-clave-buena', 'clave-inicial-123'),
      ),
    ).toBe('clave_nueva_repetida');
    expect(
      await codigoDe(
        servicio.cambiarClave(1, 't', 'la-clave-buena', 'la-clave-buena'),
      ),
    ).toBe('clave_nueva_repetida');
    expect(datos.guardarClave).not.toHaveBeenCalled();
    await servicio.cambiarClave(1, 't', 'la-clave-buena', 'nueva-larga-1');
    expect(datos.guardarClave).toHaveBeenCalledWith(
      1,
      expect.stringMatching(/^scrypt\$/),
      false,
    );
    // Se queda abierta la sesión desde donde se cambió.
    expect(datos.cerrarSesiones).toHaveBeenCalledWith(1, expect.any(String));
  });

  it('restablecer deja la contraseña inicial, exige cambiarla y cierra todas las sesiones', async () => {
    const { servicio, datos } = await armar();
    expect(await servicio.restablecerClave(1)).toBe(true);
    expect(datos.guardarClave).toHaveBeenCalledWith(
      1,
      expect.any(String),
      true,
    );
    expect(datos.cerrarSesiones).toHaveBeenCalledWith(1);
  });

  it('cerrar otras sesiones y eliminar la cuenta piden la contraseña', async () => {
    const { servicio, datos } = await armar();
    expect(await codigoDe(servicio.cerrarOtrasSesiones(1, 't', 'mala'))).toBe(
      'clave_incorrecta',
    );
    expect(await codigoDe(servicio.eliminarCuenta(1, 'mala'))).toBe(
      'clave_incorrecta',
    );
    expect(datos.cerrarSesiones).not.toHaveBeenCalled();
    expect(datos.eliminarSiQuedaOtroAdmin).not.toHaveBeenCalled();
  });

  it('el último admin no se puede eliminar', async () => {
    const { servicio } = await armar();
    expect(await codigoDe(servicio.eliminarCuenta(1, 'la-clave-buena'))).toBe(
      'ultimo_admin',
    );
  });
});
