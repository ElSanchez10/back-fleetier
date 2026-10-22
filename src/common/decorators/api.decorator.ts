import { applyDecorators, type Type } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { RespuestaErrorDto } from '../dto/respuesta-error.dto';
import { COOKIE_SESION } from '../utils/cookie.util';

const QUE_SIGNIFICA: Record<number, string> = {
  400: 'Datos inválidos',
  401: 'Sin sesión',
  403: 'Sin permiso (rol), o de otro local',
  404: 'No existe, o la cuenta no lo ve',
  409: 'Choca con una regla o con los datos guardados',
  429: 'Demasiados intentos',
  503: 'No configurado en el servidor',
};

// Los errores que puede responder un endpoint, con el formato de RespuestaErrorDto.
export const ApiErrores = (...estados: number[]) =>
  applyDecorators(
    ...estados.map((status) =>
      ApiResponse({
        status,
        description: QUE_SIGNIFICA[status],
        type: RespuestaErrorDto,
      }),
    ),
  );

// Para la clase de un controller que exige sesión (casi todos): la cookie de
// sesión y los errores que agrega el guard.
export const ApiSesion = () =>
  applyDecorators(ApiCookieAuth(COOKIE_SESION), ApiErrores(401, 403));

// Respuesta de un listado por tramos: { items: Modelo[], total }.
export const ApiPaginaResponse = <T extends Type<unknown>>(modelo: T) =>
  applyDecorators(
    ApiExtraModels(modelo),
    ApiOkResponse({
      schema: {
        properties: {
          items: { type: 'array', items: { $ref: getSchemaPath(modelo) } },
          total: {
            type: 'number',
            description: 'Todas las filas que cumplen el filtro',
          },
        },
      },
    }),
  );

// Un archivo (planilla Excel, PDF) en vez de JSON.
export const ApiArchivo = (tipo: string, descripcion: string) =>
  ApiOkResponse({
    description: descripcion,
    content: { [tipo]: { schema: { type: 'string', format: 'binary' } } },
  });
