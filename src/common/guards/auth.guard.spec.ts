import { Reflector } from '@nestjs/core';
import type { AuthService } from '@/modules/auth/auth.service';
import { codigoDe, usuario } from '../testing/pruebas';
import { ConClaveInicial, Publico } from '../decorators/publico.decorator';
import { Roles } from '../decorators/roles.decorator';
import type { UsuarioSesion } from '../interfaces/usuario-sesion.interface';
import { AuthGuard } from './auth.guard';

// Un controller de mentira con un método por caso.
@Roles('admin', 'encargado')
class Ejemplo {
  @Publico()
  publico() {}

  sinRoles() {}

  @Roles('admin')
  soloAdmin() {}

  @ConClaveInicial()
  @Roles('admin', 'asistente', 'encargado', 'coordinador')
  conClaveInicial() {}
}

class SinRolesEnLaClase {
  cualquiera() {}
}

function contexto(metodo: string, cookie?: string, Clase: object = Ejemplo) {
  const peticion: { headers: { cookie?: string }; usuario?: UsuarioSesion } = {
    headers: { cookie },
  };
  const ctx = {
    getHandler: () =>
      (Clase as { prototype: Record<string, unknown> }).prototype[metodo],
    getClass: () => Clase,
    switchToHttp: () => ({ getRequest: () => peticion }),
  };
  return { ctx: ctx as never, peticion };
}

function guard(dueno: UsuarioSesion | null) {
  const auth = {
    usuarioDeToken: vi.fn((token: string | null) =>
      Promise.resolve(token === 'bueno' ? dueno : null),
    ),
  };
  return new AuthGuard(auth as unknown as AuthService, new Reflector());
}

describe('AuthGuard', () => {
  it('una ruta pública pasa sin sesión', async () => {
    expect(await guard(null).canActivate(contexto('publico').ctx)).toBe(true);
  });

  it('sin sesión vigente: 401', async () => {
    expect(
      await codigoDe(guard(null).canActivate(contexto('sinRoles').ctx)),
    ).toBe('sin_sesion');
    expect(
      await codigoDe(
        guard(usuario('admin')).canActivate(
          contexto('sinRoles', 'fleetier_sesion=malo').ctx,
        ),
      ),
    ).toBe('sin_sesion');
  });

  it('deja en la petición al dueño de la sesión', async () => {
    const yo = usuario('encargado', 1);
    const { ctx, peticion } = contexto('sinRoles', 'fleetier_sesion=bueno');
    expect(await guard(yo).canActivate(ctx)).toBe(true);
    expect(peticion.usuario).toBe(yo);
  });

  it('el rol del método manda sobre el de la clase', async () => {
    expect(
      await codigoDe(
        guard(usuario('encargado', 1)).canActivate(
          contexto('soloAdmin', 'fleetier_sesion=bueno').ctx,
        ),
      ),
    ).toBe('sin_permiso');
    expect(
      await guard(usuario('admin')).canActivate(
        contexto('soloAdmin', 'fleetier_sesion=bueno').ctx,
      ),
    ).toBe(true);
  });

  it('sin @Roles en ninguna parte, la ruta es solo para admin', async () => {
    const ctx = (rol: 'admin' | 'asistente') =>
      guard(usuario(rol)).canActivate(
        contexto('cualquiera', 'fleetier_sesion=bueno', SinRolesEnLaClase).ctx,
      );
    expect(await ctx('admin')).toBe(true);
    expect(await codigoDe(ctx('asistente'))).toBe('sin_permiso');
  });

  it('con la contraseña inicial solo entra a lo marcado con @ConClaveInicial', async () => {
    const nueva = { ...usuario('admin'), debeCambiarClave: true };
    expect(
      await codigoDe(
        guard(nueva).canActivate(
          contexto('sinRoles', 'fleetier_sesion=bueno').ctx,
        ),
      ),
    ).toBe('debe_cambiar_clave');
    expect(
      await guard(nueva).canActivate(
        contexto('conClaveInicial', 'fleetier_sesion=bueno').ctx,
      ),
    ).toBe(true);
  });
});
