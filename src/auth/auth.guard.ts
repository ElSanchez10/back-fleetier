import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import {
  COOKIE_SESION,
  META_CON_CLAVE_INICIAL,
  META_PUBLICO,
  META_ROLES,
  Rol,
  UsuarioSesion,
  leerCookie,
} from './sesion.js';

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
        statusCode: 401,
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
        statusCode: 403,
        codigo: 'debe_cambiar_clave',
      });
    }
    const roles =
      this.reflector.getAllAndOverride<Rol[]>(META_ROLES, destinos) ??
      ROLES_POR_DEFECTO;
    if (!roles.includes(usuario.rol)) {
      throw new ForbiddenException({ statusCode: 403, codigo: 'sin_permiso' });
    }
    return true;
  }
}
