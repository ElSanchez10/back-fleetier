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
  // Está en una ruta en espera o en ejecución: no se le puede asignar otra.
  ocupado: boolean;
  ultimaRuta: {
    id: number;
    fecha: string;
    estado: string;
    local: string;
    ciudad: string;
  } | null;
}

// El conductor `d` tiene una ruta abierta (en espera o en ejecución).
export const OCUPADO = `exists (
  select 1 from ruta r
  where r.conductor_id = d.id and r.estado in ('en_espera', 'en_ejecucion'))`;

// El conductor `d` anda en una ruta que ya partió.
export const EN_RUTA = `exists (
  select 1 from ruta r where r.conductor_id = d.id and r.estado = 'en_ejecucion')`;

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
         t.nombre as "tipoConductor",
         ${OCUPADO} as ocupado,
         u.ruta as "ultimaRuta"
  from conductor d
  join ciudad c on c.id = d.ciudad_id
  join tipo_conductor t on t.id = d.tipo_conductor_id
  left join lateral (
    select json_build_object(
             'id', r.id,
             'fecha', to_char(r.fecha at time zone 'America/Santiago', 'YYYY-MM-DD"T"HH24:MI'),
             'estado', r.estado,
             'local', l.nombre,
             'ciudad', lc.nombre) as ruta
    from ruta r
    join local l on l.id = r.local_id
    join ciudad lc on lc.id = l.ciudad_id
    where r.conductor_id = d.id
    order by r.fecha desc, r.id desc
    limit 1
  ) u on true`;

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
