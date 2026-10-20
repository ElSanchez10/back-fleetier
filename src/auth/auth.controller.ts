import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  CambiarClaveDto,
  ConfirmarClaveDto,
  IngresarDto,
  PerfilDto,
} from './auth.dto.js';
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
// Además, lo de "Administrar Cuenta": mis datos, mis sesiones abiertas y
// eliminar mi cuenta (esto último solo un admin, como en la versión Laravel).
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
      {
        navegador: peticion.headers['user-agent']?.slice(0, 500) ?? null,
        ip: ipDe(peticion),
      },
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

  @Put()
  async actualizarPerfil(
    @Body() dto: PerfilDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    await this.auth.actualizarPerfil(usuario.id, dto.nombre, dto.correo);
    return { ...usuario, nombre: dto.nombre, correo: dto.correo.toLowerCase() };
  }

  @Get('dispositivos')
  dispositivos(
    @UsuarioActual() usuario: UsuarioSesion,
    @Req() peticion: Request,
  ) {
    return this.auth.sesiones(usuario.id, tokenDe(peticion));
  }

  @Post('cerrar-otras')
  @HttpCode(204)
  async cerrarOtras(
    @Body() dto: ConfirmarClaveDto,
    @UsuarioActual() usuario: UsuarioSesion,
    @Req() peticion: Request,
  ) {
    await this.auth.cerrarOtrasSesiones(
      usuario.id,
      tokenDe(peticion),
      dto.clave,
    );
  }

  @Post('eliminar-cuenta')
  @Roles('admin')
  @HttpCode(204)
  async eliminarCuenta(
    @Body() dto: ConfirmarClaveDto,
    @UsuarioActual() usuario: UsuarioSesion,
    @Res({ passthrough: true }) respuesta: Response,
  ) {
    await this.auth.eliminarCuenta(usuario.id, dto.clave);
    respuesta.clearCookie(COOKIE_SESION, { path: '/api' });
  }

  @Post('clave')
  @HttpCode(204)
  async cambiarClave(
    @Body() dto: CambiarClaveDto,
    @UsuarioActual() usuario: UsuarioSesion,
    @Req() peticion: Request,
  ) {
    await this.auth.cambiarClave(
      usuario.id,
      tokenDe(peticion),
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

// Token de la sesión de una petición que ya pasó por el guard (existe).
const tokenDe = (peticion: Request) =>
  leerCookie(peticion.headers.cookie, COOKIE_SESION)!;

function cabecera(peticion: Request, nombre: string): string | null {
  const valor = peticion.headers[nombre];
  return (Array.isArray(valor) ? valor[0] : valor) || null;
}

// Traefik deja la IP de la persona en X-Real-Ip. Una IPv4 puede llegar escrita
// como IPv6 ("::ffff:10.8.0.1"): se muestra solo la IPv4.
function ipDe(peticion: Request): string | null {
  const ip = cabecera(peticion, 'x-real-ip') ?? peticion.ip ?? '';
  return ip.replace(/^::ffff:/, '') || null;
}
