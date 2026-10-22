import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

// Un X-Request-Id que venga de afuera se acepta solo si es corto y simple, para
// que nadie pueda meter saltos de línea u otra cosa en el registro.
const ID_VALIDO = /^[\w-]{1,100}$/;

// Una línea por petición: id, método, ruta (sin la query, que puede traer datos
// personales), código y duración. Se escribe cuando la respuesta termina, así
// que también registra lo que rechaza el guard (401, 403) y el código final de
// los errores. Un interceptor no vería ninguna de las dos cosas.
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(peticion: Request, respuesta: Response, siguiente: NextFunction) {
    const recibido = peticion.header('x-request-id');
    const id = recibido && ID_VALIDO.test(recibido) ? recibido : randomUUID();
    respuesta.setHeader('X-Request-Id', id);
    const inicio = process.hrtime.bigint();
    respuesta.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
      this.logger.log(
        `${id} ${peticion.method} ${peticion.originalUrl.split('?')[0]} ${respuesta.statusCode} ${ms.toFixed(0)}ms`,
      );
    });
    siguiente();
  }
}
