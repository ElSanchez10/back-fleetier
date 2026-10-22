import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import pg from 'pg';
import { HttpExceptionFilter, traducirError } from './http-exception.filter';

function errorBd(campos: Partial<pg.DatabaseError>): pg.DatabaseError {
  return Object.assign(
    new pg.DatabaseError(campos.message ?? '', 0, 'error'),
    campos,
  );
}

describe('traducirError', () => {
  it('una regla del negocio: su código y el mensaje del catálogo', () => {
    expect(
      traducirError(new ConflictException({ codigo: 'ruta_ya_iniciada' })),
    ).toEqual({
      statusCode: 409,
      codigo: 'ruta_ya_iniciada',
      message: 'La ruta ya había partido.',
      error: 'Conflict',
    });
  });

  it('un mensaje propio de la excepción manda sobre el catálogo', () => {
    const r = traducirError(
      new NotFoundException({ codigo: 'ruta_no_existe', message: 'Otra.' }),
    );
    expect(r.message).toBe('Otra.');
  });

  it('datos inválidos: código fijo y el detalle de cada campo', () => {
    const r = traducirError(
      new BadRequestException({
        message: ['limite must be an integer number'],
        error: 'Bad Request',
        statusCode: 400,
      }),
    );
    expect(r).toMatchObject({
      statusCode: 400,
      codigo: 'datos_invalidos',
      detalles: ['limite must be an integer number'],
    });
  });

  it('una excepción de Nest sin código (ruta inexistente)', () => {
    const r = traducirError(new NotFoundException('Cannot GET /api/v1/nada'));
    expect(r).toMatchObject({ statusCode: 404, codigo: 'no_existe' });
    expect(r.message).toBe('No existe.');
  });

  it('un duplicado o una llave foránea: 409 con el nombre de la restricción', () => {
    expect(
      traducirError(errorBd({ code: '23505', constraint: 'ciudad_nombre_uk' })),
    ).toMatchObject({ statusCode: 409, codigo: 'ciudad_nombre_uk' });
    expect(
      traducirError(
        errorBd({ code: '23503', constraint: 'conductor_ciudad_fk' }),
      ),
    ).toMatchObject({ statusCode: 409, codigo: 'conductor_ciudad_fk' });
  });

  it('un check: 400 con el nombre del check', () => {
    expect(
      traducirError(errorBd({ code: '23514', constraint: 'atraso_cantidad' })),
    ).toMatchObject({ statusCode: 400, codigo: 'atraso_cantidad' });
  });

  it('no expone errores desconocidos de la base ni del código', () => {
    for (const e of [
      errorBd({ code: '42P01', message: 'relation "x" does not exist' }),
      new TypeError('x is undefined'),
    ]) {
      expect(traducirError(e)).toEqual({
        statusCode: 500,
        codigo: 'error_interno',
        message: 'Ocurrió un error en el servidor.',
        error: 'Internal Server Error',
      });
    }
  });
});

describe('HttpExceptionFilter', () => {
  it('responde con el formato único, la ruta sin la query y la hora', () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          originalUrl: '/api/v1/rutas/9?x=1',
        }),
        getResponse: () => ({ status }),
      }),
    };
    new HttpExceptionFilter().catch(
      new NotFoundException({ codigo: 'ruta_no_existe' }),
      host as never,
    );
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      statusCode: 404,
      codigo: 'ruta_no_existe',
      message: 'La ruta no existe.',
      error: 'Not Found',
      path: '/api/v1/rutas/9',
      timestamp: expect.stringMatching(/^\d{4}-\d\d-\d\dT/) as unknown,
    });
  });
});
