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
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrores, ApiSesion } from '@/common/decorators/api.decorator';
import {
  SesionAbiertaResponseDto,
  UsuarioSesionResponseDto,
} from './dto/sesion.response.dto';
import type { Request, Response } from 'express';
import {
  ConClaveInicial,
  Publico,
} from '@/common/decorators/publico.decorator';
import { Roles, TODOS_LOS_ROLES } from '@/common/decorators/roles.decorator';
import { UsuarioActual } from '@/common/decorators/usuario-actual.decorator';
import { type UsuarioSesion } from '@/common/interfaces/usuario-sesion.interface';
import { AuthService, DURACION_RECORDADA_MS } from './auth.service';
import { CambiarClaveDto } from './dto/cambiar-clave.request.dto';
import { ConfirmarClaveDto } from './dto/confirmar-clave.request.dto';
import { IngresarDto } from './dto/ingresar.request.dto';
import { PerfilDto } from './dto/perfil.request.dto';
import { COOKIE_SESION, leerCookie } from '@/common/utils/cookie.util';

// La sesión propia: entrar, saber quién soy, cambiar mi contraseña y salir.
// Disponible para todos los roles, también con la contraseña inicial.
// Además, lo de "Administrar Cuenta": mis datos, mis sesiones abiertas y
// eliminar mi cuenta (esto último solo un admin, como en la versión Laravel).
@ApiTags('Sesión')
@ApiSesion()
@Controller('sesion')
@Roles(...TODOS_LOS_ROLES)
@ConClaveInicial()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post()
  @Publico()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Inicia sesión: deja la cookie de sesión y devuelve la cuenta',
  })
  @ApiOkResponse({ type: UsuarioSesionResponseDto })
  @ApiErrores(400, 401, 429)
  async ingresar(
    @Body() dto: IngresarDto,
    @Req() peticion: Request,
    @Res({ passthrough: true }) respuesta: Response,
  ): Promise<UsuarioSesionResponseDto> {
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
  @ApiOperation({ summary: 'Quién tiene la sesión' })
  @ApiOkResponse({ type: UsuarioSesionResponseDto })
  actual(@UsuarioActual() usuario: UsuarioSesion): UsuarioSesionResponseDto {
    return usuario;
  }

  @Put()
  @ApiOperation({ summary: 'Cambia el nombre y el correo de la cuenta' })
  @ApiOkResponse({ type: UsuarioSesionResponseDto })
  @ApiErrores(400, 409)
  async actualizarPerfil(
    @Body() dto: PerfilDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<UsuarioSesionResponseDto> {
    await this.auth.actualizarPerfil(usuario.id, dto.nombre, dto.correo);
    return { ...usuario, nombre: dto.nombre, correo: dto.correo.toLowerCase() };
  }

  @Get('dispositivos')
  @ApiOperation({ summary: 'Los navegadores con la sesión abierta' })
  @ApiOkResponse({ type: [SesionAbiertaResponseDto] })
  dispositivos(
    @UsuarioActual() usuario: UsuarioSesion,
    @Req() peticion: Request,
  ): Promise<SesionAbiertaResponseDto[]> {
    return this.auth.sesiones(usuario.id, tokenDe(peticion));
  }

  @Post('cerrar-otras')
  @HttpCode(204)
  @ApiOperation({ summary: 'Cierra las demás sesiones (pide la contraseña)' })
  @ApiNoContentResponse()
  @ApiErrores(400)
  async cerrarOtras(
    @Body() dto: ConfirmarClaveDto,
    @UsuarioActual() usuario: UsuarioSesion,
    @Req() peticion: Request,
  ): Promise<void> {
    await this.auth.cerrarOtrasSesiones(
      usuario.id,
      tokenDe(peticion),
      dto.clave,
    );
  }

  @Post('eliminar-cuenta')
  @Roles('admin')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Elimina la propia cuenta (solo admin; pide la contraseña)',
  })
  @ApiNoContentResponse()
  @ApiErrores(400)
  async eliminarCuenta(
    @Body() dto: ConfirmarClaveDto,
    @UsuarioActual() usuario: UsuarioSesion,
    @Res({ passthrough: true }) respuesta: Response,
  ): Promise<void> {
    await this.auth.eliminarCuenta(usuario.id, dto.clave);
    respuesta.clearCookie(COOKIE_SESION, { path: '/api' });
  }

  @Post('clave')
  @HttpCode(204)
  @ApiOperation({ summary: 'Cambia la contraseña y cierra las demás sesiones' })
  @ApiNoContentResponse()
  @ApiErrores(400)
  async cambiarClave(
    @Body() dto: CambiarClaveDto,
    @UsuarioActual() usuario: UsuarioSesion,
    @Req() peticion: Request,
  ): Promise<void> {
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
  @ApiOperation({ summary: 'Cierra la sesión y borra la cookie' })
  @ApiNoContentResponse()
  async salir(
    @Req() peticion: Request,
    @Res({ passthrough: true }) respuesta: Response,
  ): Promise<void> {
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
