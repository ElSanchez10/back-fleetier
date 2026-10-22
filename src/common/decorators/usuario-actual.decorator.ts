import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { UsuarioSesion } from '../interfaces/usuario-sesion.interface';

// Inyecta en un parámetro al usuario de la sesión.
export const UsuarioActual = createParamDecorator(
  (_: unknown, contexto: ExecutionContext) =>
    contexto.switchToHttp().getRequest<{ usuario: UsuarioSesion }>().usuario,
);
