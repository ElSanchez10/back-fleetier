import { Injectable, OnModuleDestroy } from '@nestjs/common';
import pg from 'pg';

// Las columnas date llegan como texto 'AAAA-MM-DD'. Por defecto pg las convierte
// a Date en la zona horaria del servidor, y el día puede correrse al serializar.
const TIPO_DATE = 1082;
pg.types.setTypeParser(TIPO_DATE, (valor) => valor);

export type Consultar = <T extends pg.QueryResultRow>(
  sql: string,
  parametros?: unknown[],
) => Promise<T[]>;

// Acceso a Postgres con SQL directo. El esquema lo define bd-dsl;
// aquí solo se consulta.
@Injectable()
export class BdService implements OnModuleDestroy {
  private readonly pool: pg.Pool;

  constructor() {
    // La conexión se toma de las variables estándar de Postgres
    // (PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD).
    if (!process.env.PGHOST) {
      throw new Error('Falta la variable de entorno PGHOST');
    }
    this.pool = new pg.Pool();
  }

  async consultar<T extends pg.QueryResultRow>(
    sql: string,
    parametros: unknown[] = [],
  ): Promise<T[]> {
    const resultado = await this.pool.query<T>(sql, parametros);
    return resultado.rows;
  }

  // Ejecuta `trabajo` dentro de una transacción: si lanza un error, nada queda guardado.
  // Las consultas de adentro deben usar la función que reciben, no `this.consultar`.
  async transaccion<R>(
    trabajo: (consultar: Consultar) => Promise<R>,
  ): Promise<R> {
    const cliente = await this.pool.connect();
    try {
      await cliente.query('begin');
      const resultado = await trabajo(async (sql, parametros = []) => {
        const r = await cliente.query(sql, parametros);
        return r.rows;
      });
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
