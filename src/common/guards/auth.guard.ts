import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService } from '@/modules/auth/auth.service';
import { COOKIE_SESION, leerCookie } from '@/common/utils/cookie.util';
import {
  META_CON_CLAVE_INICIAL,
  META_PUBLICO,
} from '../decorators/publico.decorator';
import { META_ROLES } from '../decorators/roles.decorator';
import { Rol, UsuarioSesion } from '../interfaces/usuario-sesion.interface';

const ROLES_POR_DEFECTO: Rol[] = ['admin'];

// Se aplica a toda la API: exige una sesión vigente, que la cuenta ya haya
// cambiado su contraseña inicial y que su rol pueda usar la ruta.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const destinos = [contexto.getHandler(), contexto.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(META_PUBLICO, destinos)) {
      return true;
    }

    const peticion = contexto
      .switchToHttp()
      .getRequest<Request & { usuario?: UsuarioSesion }>();
    const usuario = await this.auth.usuarioDeToken(
      leerCookie(peticion.headers.cookie, COOKIE_SESION),
    );
    if (!usuario) {
      throw new UnauthorizedException({
        codigo: 'sin_sesion',
      });
    }
    peticion.usuario = usuario;

    if (
      usuario.debeCambiarClave &&
      !this.reflector.getAllAndOverride<boolean>(
        META_CON_CLAVE_INICIAL,
        destinos,
      )
    ) {
      throw new ForbiddenException({
        codigo: 'debe_cambiar_clave',
      });
    }
    const roles =
      this.reflector.getAllAndOverride<Rol[]>(META_ROLES, destinos) ??
      ROLES_POR_DEFECTO;
    if (!roles.includes(usuario.rol)) {
      throw new ForbiddenException({ codigo: 'sin_permiso' });
    }
    return true;
  }
}
