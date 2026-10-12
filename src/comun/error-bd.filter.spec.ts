import pg from 'pg';
import { traducirErrorBd } from './error-bd.filter.js';

function errorBd(campos: Partial<pg.DatabaseError>): pg.DatabaseError {
  return Object.assign(
    new pg.DatabaseError(campos.message ?? '', 0, 'error'),
    campos,
  );
}

describe('traducirErrorBd', () => {
  it('usa el texto del raise como código', () => {
    const r = traducirErrorBd(
      errorBd({ code: 'P0001', message: 'cooler_no_disponible' }),
    );
    expect(r).toEqual({ statusCode: 409, codigo: 'cooler_no_disponible' });
  });

  it('usa el nombre de la restricción en un duplicado', () => {
    const r = traducirErrorBd(
      errorBd({ code: '23505', constraint: 'ciudad_nombre_uk' }),
    );
    expect(r).toEqual({ statusCode: 409, codigo: 'ciudad_nombre_uk' });
  });

  it('no expone errores desconocidos', () => {
    const r = traducirErrorBd(
      errorBd({ code: '42P01', message: 'relation "x" does not exist' }),
    );
    expect(r).toEqual({ statusCode: 500, codigo: 'error_interno' });
  });
});
