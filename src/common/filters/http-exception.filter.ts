import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { STATUS_CODES } from 'node:http';
import pg from 'pg';
import { MENSAJE_POR_ESTADO, MENSAJES } from '../errors/mensajes';

// Códigos de error de Postgres que son culpa de la petición y no del servidor.
const UNICO = '23505';
const LLAVE_FORANEA = '23503';
const CHECK = '23514';

// Lo que responde la API ante cualquier error, siempre con la misma forma.
export interface RespuestaError {
  statusCode: number;
  // Lo que usa el front para elegir el mensaje: el de la regla
  // ("ruta_ya_partio") o el nombre de la restricción violada ("ciudad_nombre_uk").
  codigo: string;
  message: string;
  // Solo en datos inválidos: qué campos fallaron, según class-validator.
  detalles?: string[];
  error: string;
  path: string;
  timestamp: string;
}

type Traducido = Pick<RespuestaError, 'statusCode' | 'codigo'> & {
  message?: string;
  detalles?: string[];
};

// El código por defecto de una excepción de Nest que no trae `codigo` (una
// ruta inexistente, un cuerpo demasiado grande…).
const CODIGO_POR_ESTADO: Record<number, string> = {
  400: 'datos_invalidos',
  401: 'sin_sesion',
  403: 'sin_permiso',
  404: 'no_existe',
};

function desdeHttp(excepcion: HttpException): Traducido {
  const statusCode = excepcion.getStatus();
  const cuerpo = excepcion.getResponse();
  const datos: Record<string, unknown> =
    typeof cuerpo === 'object' && cuerpo !== null
      ? (cuerpo as Record<string, unknown>)
      : { message: cuerpo };
  // Errores del ValidationPipe: `message` es la lista de lo que falló.
  if (Array.isArray(datos.message)) {
    return {
      statusCode,
      codigo: 'datos_invalidos',
      detalles: datos.message.map(String),
    };
  }
  const propio = typeof datos.codigo === 'string';
  return {
    statusCode,
    codigo: propio
      ? (datos.codigo as string)
      : (CODIGO_POR_ESTADO[statusCode] ?? 'error'),
    // Un mensaje propio solo si la excepción trae `codigo` y `message`; el
    // texto genérico de Nest ("Not Found") no sirve.
    message:
      propio && typeof datos.message === 'string' ? datos.message : undefined,
  };
}

function desdeBd(error: pg.DatabaseError): Traducido {
  switch (error.code) {
    case UNICO:
    case LLAVE_FORANEA:
      return {
        statusCode: HttpStatus.CONFLICT,
        codigo: error.constraint ?? 'conflicto',
      };
    case CHECK:
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        codigo: error.constraint ?? 'datos_invalidos',
      };
    default:
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        codigo: 'error_interno',
      };
  }
}

// Traduce cualquier error a la respuesta de la API. Lo que no es una excepción
// de Nest ni un error esperable de la base es un 500, sin detalles hacia afuera.
export function traducirError(
  excepcion: unknown,
): Omit<RespuestaError, 'path' | 'timestamp'> {
  const t: Traducido =
    excepcion instanceof HttpException
      ? desdeHttp(excepcion)
      : excepcion instanceof pg.DatabaseError
        ? desdeBd(excepcion)
        : {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            codigo: 'error_interno',
          };
  return {
    statusCode: t.statusCode,
    codigo: t.codigo,
    message:
      t.message ??
      MENSAJES[t.codigo] ??
      MENSAJE_POR_ESTADO[t.statusCode] ??
      MENSAJES.error_interno,
    ...(t.detalles ? { detalles: t.detalles } : {}),
    error: STATUS_CODES[t.statusCode] ?? 'Error',
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(excepcion: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const peticion = http.getRequest<Request>();
    const respuesta = http.getResponse<Response>();
    const cuerpo: RespuestaError = {
      ...traducirError(excepcion),
      path: peticion.originalUrl.split('?')[0],
      timestamp: new Date().toISOString(),
    };
    if (cuerpo.statusCode >= 500) {
      this.logger.error(
        `${peticion.method} ${cuerpo.path}`,
        excepcion instanceof Error ? excepcion.stack : String(excepcion),
      );
    }
    respuesta.status(cuerpo.statusCode).json(cuerpo);
  }
}
