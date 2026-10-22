import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';

// El mayor id que cabe en una columna int de Postgres.
export const ID_MAXIMO = 2_147_483_647;

// Convierte el id de la ruta ("/usuarios/12") a número. Si no es un id
// posible, la respuesta es la misma que si no existiera.
@Injectable()
export class IdPipe implements PipeTransform<string, number> {
  transform(valor: string): number {
    const id = /^\d{1,10}$/.test(valor) ? Number(valor) : 0;
    if (id < 1 || id > ID_MAXIMO) {
      throw new NotFoundException({ codigo: 'no_existe' });
    }
    return id;
  }
}
