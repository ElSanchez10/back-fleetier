import type { QueryResultRow } from 'pg';
import { DatabaseService } from '@/common/database/database.service';

// Acceso a un catálogo simple (ciudades, locales, tipos…), para CatalogoService.
// Aquí no se decide nada: solo se lee y se escribe.

// Describe un catálogo: su tabla, cómo se lee y qué campos se guardan. Todo
// sale de constantes del código (catalogos.sql.ts), nunca de la petición: por
// eso puede ir dentro del SQL.
export interface Catalogo<T extends object> {
  tabla: string;
  // Consulta que lista el catálogo, con la tabla bajo el alias "c" y sin orden.
  select: string;
  orden: string;
  // Traduce cada campo del DTO a su columna.
  columnas: Record<keyof T, string>;
}

// No lleva @Injectable(): hay uno por catálogo y los arma la fábrica de
// CatalogosModule, cada uno con su Catalogo.
export class CatalogoRepository<T extends object, R extends QueryResultRow> {
  constructor(
    private readonly bd: DatabaseService,
    private readonly catalogo: Catalogo<T>,
  ) {}

  listar(): Promise<R[]> {
    const { select, orden } = this.catalogo;
    return this.bd.consultar<R>(`${select} order by ${orden}`);
  }

  async uno(id: number): Promise<R | undefined> {
    const [fila] = await this.bd.consultar<R>(
      `${this.catalogo.select} where c.id = $1`,
      [id],
    );
    return fila;
  }

  async insertar(dto: T): Promise<number> {
    const { tabla, columnas } = this.catalogo;
    const campos = Object.keys(columnas) as (keyof T)[];
    const [{ id }] = await this.bd.consultar<{ id: number }>(
      `insert into ${tabla} (${campos.map((c) => columnas[c]).join(', ')})
       values (${campos.map((_, i) => `$${i + 1}`).join(', ')})
       returning id`,
      campos.map((c) => dto[c]),
    );
    return id;
  }

  // false si no existe.
  async actualizar(id: number, dto: T): Promise<boolean> {
    const { tabla, columnas } = this.catalogo;
    const campos = Object.keys(columnas) as (keyof T)[];
    const cambiados = await this.bd.consultar(
      `update ${tabla}
       set ${campos.map((c, i) => `${columnas[c]} = $${i + 2}`).join(', ')}
       where id = $1 returning id`,
      [id, ...campos.map((c) => dto[c])],
    );
    return cambiados.length > 0;
  }

  // Si algo lo usa, la llave foránea lo impide (409 con su nombre). false si
  // no existe.
  async eliminar(id: number): Promise<boolean> {
    const borrados = await this.bd.consultar(
      `delete from ${this.catalogo.tabla} where id = $1 returning id`,
      [id],
    );
    return borrados.length > 0;
  }
}
