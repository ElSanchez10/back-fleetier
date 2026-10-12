import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CambiarClaveDto, IngresarDto } from './auth.dto.js';
import { AuthService, DURACION_RECORDADA_MS } from './auth.service.js';
import {
  COOKIE_SESION,
  ConClaveInicial,
  Publico,
  Roles,
  TODOS_LOS_ROLES,
  UsuarioActual,
  type UsuarioSesion,
  leerCookie,
} from './sesion.js';

// La sesión propia: entrar, saber quién soy, cambiar mi contraseña y salir.
// Disponible para todos los roles, también con la contraseña inicial.
@Controller('sesion')
@Roles(...TODOS_LOS_ROLES)
@ConClaveInicial()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post()
  @Publico()
  @HttpCode(200)
  async ingresar(
    @Body() dto: IngresarDto,
    @Req() peticion: Request,
    @Res({ passthrough: true }) respuesta: Response,
  ) {
    const { token, usuario } = await this.auth.ingresar(
      dto.correo,
      dto.clave,
      dto.recordar ?? false,
    );
    respuesta.cookie(COOKIE_SESION, token, {
      // El navegador no deja leerla desde JavaScript ni la envía a otros sitios.
      httpOnly: true,
      sameSite: 'strict',
      // Detrás de Traefik la petición llega por HTTP: el esquema real viene en la cabecera.
      secure: peticion.headers['x-forwarded-proto'] === 'https',
      path: '/api',
      // Sin "mantener sesión", la cookie dura lo que dure abierto el navegador.
      ...(dto.recordar ? { maxAge: DURACION_RECORDADA_MS } : {}),
    });
    return usuario;
  }

  @Get()
  actual(@UsuarioActual() usuario: UsuarioSesion) {
    return usuario;
  }

  @Post('clave')
  @HttpCode(204)
  async cambiarClave(
    @Body() dto: CambiarClaveDto,
    @UsuarioActual() usuario: UsuarioSesion,
    @Req() peticion: Request,
  ) {
    const token = leerCookie(peticion.headers.cookie, COOKIE_SESION)!;
    await this.auth.cambiarClave(
      usuario.id,
      token,
      dto.claveActual,
      dto.claveNueva,
    );
  }

  @Delete()
  @Publico()
  @HttpCode(204)
  async salir(
    @Req() peticion: Request,
    @Res({ passthrough: true }) respuesta: Response,
  ) {
    await this.auth.salir(leerCookie(peticion.headers.cookie, COOKIE_SESION));
    respuesta.clearCookie(COOKIE_SESION, { path: '/api' });
  }
}
