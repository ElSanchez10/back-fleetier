import { NotFoundException } from '@nestjs/common';
import { BdService } from '../bd/bd.service.js';

// Describe un catálogo simple: su tabla, cómo se lee y qué campos se guardan.
// Todo sale de constantes del código, nunca de la petición: por eso puede ir
// dentro del SQL.
export interface Catalogo<T extends object> {
  tabla: string;
  // Consulta que lista el catálogo, con la tabla bajo el alias "c" y sin orden.
  select: string;
  orden: string;
  // Traduce cada campo del DTO a su columna.
  columnas: Record<keyof T, string>;
}

function noExiste(): never {
  throw new NotFoundException({
    statusCode: 404,
    codigo: 'catalogo_item_no_existe',
  });
}

// Las cuatro operaciones de un catálogo. Los catálogos son listas cortas: se
// devuelven completas, sin tramos.
export class Mantenedor<T extends object> {
  constructor(
    private readonly bd: BdService,
    private readonly catalogo: Catalogo<T>,
  ) {}

  listar(donde = '', parametros: unknown[] = []) {
    const { select, orden } = this.catalogo;
    return this.bd.consultar(
      `${select} ${donde} order by ${orden}`,
      parametros,
    );
  }

  async crear(dto: T) {
    const { tabla, columnas } = this.catalogo;
    const campos = Object.keys(columnas) as (keyof T)[];
    const [{ id }] = await this.bd.consultar<{ id: number }>(
      `insert into ${tabla} (${campos.map((c) => columnas[c]).join(', ')})
       values (${campos.map((_, i) => `$${i + 1}`).join(', ')})
       returning id`,
      campos.map((c) => dto[c]),
    );
    return this.uno(id);
  }

  async editar(id: number, dto: T) {
    const { tabla, columnas } = this.catalogo;
    const campos = Object.keys(columnas) as (keyof T)[];
    const cambiados = await this.bd.consultar(
      `update ${tabla}
       set ${campos.map((c, i) => `${columnas[c]} = $${i + 2}`).join(', ')}
       where id = $1 returning id`,
      [id, ...campos.map((c) => dto[c])],
    );
    if (cambiados.length === 0) {
      noExiste();
    }
    return this.uno(id);
  }

  // Solo se elimina lo que nada usa: si algo lo usa, la llave foránea lo impide
  // y la respuesta es un 409 con el nombre de esa llave.
  async eliminar(id: number) {
    const borrados = await this.bd.consultar(
      `delete from ${this.catalogo.tabla} where id = $1 returning id`,
      [id],
    );
    if (borrados.length === 0) {
      noExiste();
    }
  }

  private async uno(id: number) {
    const [item] = await this.bd.consultar(
      `${this.catalogo.select} where c.id = $1`,
      [id],
    );
    return item;
  }
}
