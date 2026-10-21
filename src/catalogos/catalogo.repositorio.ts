import { BdService } from '../bd/bd.service.js';

// Acceso a un catálogo simple (ciudades, locales, tipos…), para Mantenedor.
// Aquí no se decide nada: solo se lee y se escribe.

// Describe un catálogo: su tabla, cómo se lee y qué campos se guardan. Todo
// sale de constantes del código, nunca de la petición: por eso puede ir
// dentro del SQL.
export interface Catalogo<T extends object> {
  tabla: string;
  // Consulta que lista el catálogo, con la tabla bajo el alias "c" y sin orden.
  select: string;
  orden: string;
  // Traduce cada campo del DTO a su columna.
  columnas: Record<keyof T, string>;
}

export class CatalogoRepositorio<T extends object> {
  constructor(
    private readonly bd: BdService,
    private readonly catalogo: Catalogo<T>,
  ) {}

  // `donde`, si viene, es un filtro fijo del código (con sus parámetros).
  listar(donde = '', parametros: unknown[] = []) {
    const { select, orden } = this.catalogo;
    return this.bd.consultar(
      `${select} ${donde} order by ${orden}`,
      parametros,
    );
  }

  async uno(id: number) {
    const [item] = await this.bd.consultar(
      `${this.catalogo.select} where c.id = $1`,
      [id],
    );
    return item;
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
