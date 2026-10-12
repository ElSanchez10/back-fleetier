import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import pg from 'pg';

// Códigos de error de Postgres que son culpa de la petición y no del servidor.
const P0001_RAISE = 'P0001'; // raise exception de una función o trigger
const UNICO = '23505';
const LLAVE_FORANEA = '23503';
const CHECK = '23514';

export interface RespuestaError {
  statusCode: number;
  codigo: string;
}

// Traduce un error de Postgres a la respuesta HTTP. `codigo` es lo que el front
// usa para elegir el mensaje: el texto del raise ("cooler_no_disponible") o el nombre
// de la restricción violada ("ciudad_nombre_uk").
export function traducirErrorBd(error: pg.DatabaseError): RespuestaError {
  switch (error.code) {
    case P0001_RAISE:
      return { statusCode: HttpStatus.CONFLICT, codigo: error.message };
    case UNICO:
    case LLAVE_FORANEA:
      return {
        statusCode: HttpStatus.CONFLICT,
        codigo: error.constraint ?? 'conflicto',
      };
    case CHECK:
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        codigo: error.constraint ?? 'dato_invalido',
      };
    default:
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        codigo: 'error_interno',
      };
  }
}

@Catch(pg.DatabaseError)
export class ErrorBdFilter implements ExceptionFilter {
  catch(error: pg.DatabaseError, host: ArgumentsHost) {
    const respuesta = traducirErrorBd(error);
    if (respuesta.statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
      console.error(error);
    }
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(respuesta.statusCode)
      .json(respuesta);
  }
}
