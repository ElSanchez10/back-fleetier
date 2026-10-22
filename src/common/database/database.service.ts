import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pg from 'pg';
import type { Entorno } from '../config/env.validation';

// Las columnas date llegan como texto 'AAAA-MM-DD'. Por defecto pg las convierte
// a Date en la zona horaria del servidor, y el día puede correrse al serializar.
const TIPO_DATE = 1082;
pg.types.setTypeParser(TIPO_DATE, (valor) => valor);

export type Consultar = <T extends pg.QueryResultRow>(
  sql: string,
  parametros?: unknown[],
) => Promise<T[]>;

// Acceso a Postgres con SQL directo. El esquema lo define bd-fleetier;
// aquí solo se consulta.
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: pg.Pool;

  constructor(config: ConfigService<Entorno, true>) {
    // Las variables estándar de Postgres, ya validadas al arrancar.
    this.pool = new pg.Pool({
      host: config.get('PGHOST', { infer: true }),
      port: config.get('PGPORT', { infer: true }),
      database: config.get('PGDATABASE', { infer: true }),
      user: config.get('PGUSER', { infer: true }),
      password: config.get('PGPASSWORD', { infer: true }),
    });
  }

  // Propiedad flecha, no método: se puede pasar como valor (por ejemplo, como
  // la `sql` por defecto de un repositorio) sin perder `this`.
  readonly consultar: Consultar = async <T extends pg.QueryResultRow>(
    sql: string,
    parametros: unknown[] = [],
  ): Promise<T[]> => (await this.pool.query<T>(sql, parametros)).rows;

  // Ejecuta `trabajo` dentro de una transacción: si lanza un error, nada queda guardado.
  // Las consultas de adentro deben usar la función que reciben, no `this.consultar`.
  async transaccion<R>(
    trabajo: (consultar: Consultar) => Promise<R>,
  ): Promise<R> {
    const cliente = await this.pool.connect();
    try {
      await cliente.query('begin');
      const resultado = await trabajo(
        async <T extends pg.QueryResultRow>(
          sql: string,
          parametros: unknown[] = [],
        ) => (await cliente.query<T>(sql, parametros)).rows,
      );
      await cliente.query('commit');
      return resultado;
    } catch (error) {
      await cliente.query('rollback');
      throw error;
    } finally {
      cliente.release();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
