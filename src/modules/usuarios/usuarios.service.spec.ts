import { bdFalsa, codigoDe, usuario } from '@/common/testing/pruebas';
import type { AuthService } from '@/modules/auth/auth.service';
import type { UsuarioDto } from './dto/usuario.request.dto';
import type { UsuariosRepository } from './repositories/usuarios.repository';
import { UsuariosService } from './usuarios.service';
import { datosDelUsuario } from './utils/usuarios.util';

// La administración de cuentas con un repositorio emulado.

const dto = (cambios: Partial<UsuarioDto> = {}) =>
  ({
    nombre: 'Ana',
    correo: 'Ana@DSL.cl',
    rol: 'encargado',
    localId: 3,
    ...cambios,
  }) as UsuarioDto;

function armar() {
  const datos = {
    actualizar: vi.fn(() => Promise.resolve(true)),
    eliminar: vi.fn(() => Promise.resolve(true)),
    uno: vi.fn((id: number) => Promise.resolve({ id })),
  };
  const auth = {
    crearUsuario: vi.fn(() => Promise.resolve(9)),
    restablecerClave: vi.fn(() => Promise.resolve(false)),
    claveDeInicio: 'inicial-123',
  };
  const servicio = new UsuariosService(
    bdFalsa,
    datos as unknown as UsuariosRepository,
    auth as unknown as AuthService,
  );
  return { datos, auth, servicio };
}

describe('UsuariosService', () => {
  it('el local solo vale para encargado y coordinador', () => {
    expect(datosDelUsuario(dto()).localId).toBe(3);
    expect(datosDelUsuario(dto({ rol: 'coordinador' })).localId).toBe(3);
    expect(datosDelUsuario(dto({ rol: 'admin' })).localId).toBeNull();
    expect(datosDelUsuario(dto({ rol: 'asistente' })).localId).toBeNull();
  });

  it('nadie cambia su propio rol', async () => {
    const { servicio, datos } = armar();
    const yo = { ...usuario('admin'), id: 5 };
    expect(
      await codigoDe(servicio.editar(5, dto({ rol: 'asistente' }), yo)),
    ).toBe('no_puedes_cambiar_tu_rol');
    expect(datos.actualizar).not.toHaveBeenCalled();
    expect(await codigoDe(servicio.editar(5, dto({ rol: 'admin' }), yo))).toBe(
      'sin error',
    );
    expect(
      await codigoDe(servicio.editar(6, dto({ rol: 'asistente' }), yo)),
    ).toBe('sin error');
  });

  it('nadie se elimina a sí mismo', async () => {
    const { servicio, datos } = armar();
    const yo = { ...usuario('admin'), id: 5 };
    expect(await codigoDe(servicio.eliminar(5, yo))).toBe(
      'no_puedes_eliminarte',
    );
    expect(datos.eliminar).not.toHaveBeenCalled();
  });

  it('crear entrega la contraseña inicial; un admin se crea sin local', async () => {
    const { servicio, auth } = armar();
    const r = await servicio.crear(dto({ rol: 'admin' }));
    expect(r.claveInicial).toBe('inicial-123');
    expect(auth.crearUsuario).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ localId: null }),
    );
  });

  it('cuentas que no existen', async () => {
    const { servicio, datos } = armar();
    expect(await codigoDe(servicio.restablecer(99))).toBe('usuario_no_existe');
    datos.actualizar.mockResolvedValueOnce(false);
    expect(await codigoDe(servicio.editar(99, dto(), usuario('admin')))).toBe(
      'usuario_no_existe',
    );
  });
});
