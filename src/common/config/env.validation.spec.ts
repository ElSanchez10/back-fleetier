import { validarEntorno } from './env.validation';

const MINIMO = {
  PGHOST: 'db',
  PGDATABASE: 'dsl',
  PGUSER: 'dsl',
  PGPASSWORD: 'x',
  CLAVE_INICIAL: 'clave-inicial',
};

describe('validarEntorno', () => {
  it('con lo mínimo arranca, con los valores por defecto', () => {
    expect(validarEntorno(MINIMO)).toMatchObject({
      PORT: 3000,
      PGPORT: 5432,
      SWAGGER_HABILITADO: false,
    });
  });

  it('convierte los números y "true"', () => {
    expect(
      validarEntorno({ ...MINIMO, PORT: '8080', SWAGGER_HABILITADO: 'true' }),
    ).toMatchObject({ PORT: 8080, SWAGGER_HABILITADO: true });
  });

  it('si falta una variable o es inválida, no arranca y dice cuál', () => {
    expect(() => validarEntorno({ ...MINIMO, PGHOST: undefined })).toThrow(
      /PGHOST/,
    );
    expect(() => validarEntorno({ ...MINIMO, CLAVE_INICIAL: 'corta' })).toThrow(
      /CLAVE_INICIAL/,
    );
    expect(() => validarEntorno({ ...MINIMO, CLAVE_CUENTAS: 'corta' })).toThrow(
      /CLAVE_CUENTAS/,
    );
    expect(() =>
      validarEntorno({ ...MINIMO, ADMIN_CORREO: 'no-es-correo' }),
    ).toThrow(/ADMIN_CORREO/);
  });
});
