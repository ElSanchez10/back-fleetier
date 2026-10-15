import { Injectable, NotFoundException } from '@nestjs/common';
import type { UsuarioSesion } from '../auth/sesion.js';
import { BdService } from '../bd/bd.service.js';
import { localVisible } from '../comun/alcance.js';
import type { EstadoRuta } from './ruta.dto.js';

// Las fechas de las rutas se guardan con zona horaria y se muestran y filtran
// en hora de Chile, que es la de la operación.
export const ZONA = 'America/Santiago';

// La fecha con hora como la usa un <input type="datetime-local">.
export function horaLocal(columna: string): string {
  return `to_char(${columna} at time zone '${ZONA}', 'YYYY-MM-DD"T"HH24:MI')`;
}

// El día de Chile en que sale una ruta.
export const DIA_RUTA = `(r.fecha at time zone '${ZONA}')::date`;

// Lo que llega del front ("2026-10-15T08:30", hora de Chile) a timestamptz.
export function desdeHoraLocal(parametro: string): string {
  return `(${parametro}::timestamp at time zone '${ZONA}')`;
}

export interface Ruta {
  id: number;
  fecha: string;
  ordenes: number;
  estado: EstadoRuta;
  localId: number;
  local: string;
  ciudadId: number;
  ciudad: string;
  conductorId: number | null;
  conductor: string | null;
  conductorTelefono: string | null;
  coolers: number;
  devueltos: number;
  problemas: number;
}

export const SELECT_RUTA = `
  select r.id,
         ${horaLocal('r.fecha')} as fecha,
         r.ordenes,
         r.estado,
         r.local_id as "localId",
         l.nombre as local,
         l.ciudad_id as "ciudadId",
         c.nombre as ciudad,
         r.conductor_id as "conductorId",
         d.nombre as conductor,
         d.telefono as "conductorTelefono",
         (select count(*)::int from ruta_cooler rc where rc.ruta_id = r.id) as coolers,
         (select count(*)::int from ruta_cooler rc where rc.ruta_id = r.id and rc.devuelto) as devueltos,
         (select count(*)::int from problema_ruta p where p.ruta_id = r.id) as problemas
  from ruta r
  join local l on l.id = r.local_id
  join ciudad c on c.id = l.ciudad_id
  left join conductor d on d.id = r.conductor_id`;

@Injectable()
export class RutasService {
  constructor(private readonly bd: BdService) {}

  // Una ruta de otro local se trata igual que una que no existe.
  async buscar(id: number, usuario: UsuarioSesion): Promise<Ruta> {
    const [ruta] = await this.bd.consultar<Ruta>(
      `${SELECT_RUTA} where r.id = $1 and ($2::int is null or r.local_id = $2)`,
      [id, localVisible(usuario)],
    );
    if (!ruta) {
      throw new NotFoundException({
        statusCode: 404,
        codigo: 'ruta_no_existe',
      });
    }
    return ruta;
  }
}
