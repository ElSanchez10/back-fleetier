import { Injectable } from '@nestjs/common';
import { BdService } from '../bd/bd.service.js';
import { EN_RUTA, enSuCiudad } from '../conductores/conductores.repositorio.js';
import { DIA_RUTA } from '../rutas/rutas.sql.js';

// Acceso a los datos de la pantalla de inicio, para ResumenService. `localId`
// null: todos los locales.

export interface ActividadLocal {
  localId: number;
  local: string;
  ciudad: string;
  rutas: number;
  ordenes: number;
}

@Injectable()
export class ResumenRepositorio {
  constructor(private readonly bd: BdService) {}

  // Rutas abiertas, coolers disponibles y conductores en ruta.
  async indicadores(localId: number | null) {
    const [indicadores] = await this.bd.consultar(
      `select
         (select count(*) from ruta
          where estado = 'en_ejecucion' and ($1::int is null or local_id = $1))::int
           as "rutasActivas",
         (select count(*) from ruta
          where estado = 'pendiente' and ($1::int is null or local_id = $1))::int
           as "rutasPendientes",
         (select count(*) from cooler
          where estado = 'disponible' and ($1::int is null or local_id = $1))::int
           as "coolersDisponibles",
         (select count(*) from conductor d
          where ${enSuCiudad('$1')} and ${EN_RUTA})::int as "conductoresEnRuta"`,
      [localId],
    );
    return indicadores;
  }

  // Todos los estados, también los que no tienen coolers (cantidad 0).
  coolersPorEstado(localId: number | null) {
    return this.bd.consultar(
      `select e.estado, count(k.id)::int as cantidad
       from unnest(enum_range(null::estado_cooler)) with ordinality as e(estado, orden)
       left join cooler k on k.estado = e.estado and ($1::int is null or k.local_id = $1)
       group by e.estado, e.orden
       order by e.orden`,
      [localId],
    );
  }

  // Rutas y órdenes de cada local en un mes ('AAAA-MM'). No cuenta las rutas
  // pre-cargadas (en espera): todavía no han salido.
  actividadLocales(
    mes: string,
    ciudadId: number | null,
    localId: number | null,
  ): Promise<ActividadLocal[]> {
    return this.bd.consultar<ActividadLocal>(
      `select l.id as "localId", l.nombre as local, c.nombre as ciudad,
              count(r.id)::int as rutas,
              coalesce(sum(r.ordenes), 0)::int as ordenes
       from local l
       join ciudad c on c.id = l.ciudad_id
       left join ruta r on r.local_id = l.id
         and r.estado <> 'en_espera'
         and date_trunc('month', ${DIA_RUTA}) = to_date($1, 'YYYY-MM')
       where ($2::int is null or l.ciudad_id = $2)
         and ($3::int is null or l.id = $3)
       group by l.id, l.nombre, c.nombre
       order by lower(c.nombre), lower(l.nombre)`,
      [mes, ciudadId, localId],
    );
  }
}
