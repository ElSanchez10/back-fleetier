import { Injectable, NotFoundException } from '@nestjs/common';
import type { UsuarioSesion } from '../auth/sesion.js';
import { BdService } from '../bd/bd.service.js';

export interface Conductor {
  id: number;
  nombre: string;
  run: string;
  fechaNacimiento: string;
  telefono: string;
  email: string;
  ciudadId: number;
  ciudad: string;
  tipoConductorId: number;
  tipoConductor: string;
}

export const SELECT_CONDUCTOR = `
  select d.id,
         d.nombre,
         d.run,
         d.fecha_nacimiento as "fechaNacimiento",
         d.telefono,
         d.email,
         d.ciudad_id as "ciudadId",
         c.nombre as ciudad,
         d.tipo_conductor_id as "tipoConductorId",
         t.nombre as "tipoConductor"
  from conductor d
  join ciudad c on c.id = d.ciudad_id
  join tipo_conductor t on t.id = d.tipo_conductor_id`;

// Los conductores son de una ciudad, no de un local: una cuenta con local ve
// los de la ciudad de su local. `parametro` es el número ($n) que lleva el
// local de la cuenta (null si no tiene: ve todos).
export function enSuCiudad(parametro: string): string {
  return `(${parametro}::int is null
           or d.ciudad_id = (select ciudad_id from local where id = ${parametro}))`;
}

@Injectable()
export class ConductoresService {
  constructor(private readonly bd: BdService) {}

  // Un conductor de otra ciudad se trata igual que uno que no existe.
  async buscar(id: number, usuario: UsuarioSesion): Promise<Conductor> {
    const [conductor] = await this.bd.consultar<Conductor>(
      `${SELECT_CONDUCTOR} where d.id = $1 and ${enSuCiudad('$2')}`,
      [id, usuario.localId],
    );
    if (!conductor) {
      throw new NotFoundException({
        statusCode: 404,
        codigo: 'conductor_no_existe',
      });
    }
    return conductor;
  }
}
