import { Controller, Get, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import {
  Roles,
  TODOS_LOS_ROLES,
  UsuarioActual,
  type UsuarioSesion,
} from '../auth/sesion.js';
import { BdService } from '../bd/bd.service.js';
import { localVisible } from '../comun/alcance.js';
import { type Columna, excel, EXPORTAN } from '../comun/excel.js';
import { ID_MAXIMO } from '../comun/id.pipe.js';
import { EN_RUTA, enSuCiudad } from '../conductores/conductores.service.js';
import { DIA_RUTA } from '../rutas/rutas.service.js';

export class FiltroActividadLocalesDto {
  // 'AAAA-MM'
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  mes: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  ciudadId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ID_MAXIMO)
  localId?: number;
}

interface ActividadLocal {
  localId: number;
  local: string;
  ciudad: string;
  rutas: number;
  ordenes: number;
}

const COLUMNAS_EXCEL: Columna<ActividadLocal>[] = [
  { titulo: 'Ciudad', valor: (a) => a.ciudad },
  { titulo: 'Local', valor: (a) => a.local },
  { titulo: 'Rutas', valor: (a) => a.rutas, tipo: 'numero' },
  { titulo: 'Órdenes de pedido', valor: (a) => a.ordenes, tipo: 'numero' },
];

// Lo que muestra la pantalla de inicio. Una cuenta con local ve solo lo de su
// local (y los conductores de su ciudad).
@Controller('resumen')
@Roles(...TODOS_LOS_ROLES)
export class ResumenController {
  constructor(private readonly bd: BdService) {}

  // Cómo está la operación ahora: rutas abiertas, coolers y conductores.
  @Get()
  async resumen(@UsuarioActual() usuario: UsuarioSesion) {
    const local = localVisible(usuario);
    const [[indicadores], coolers] = await Promise.all([
      this.bd.consultar(
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
        [local],
      ),
      // Todos los estados, también los que no tienen coolers (cantidad 0).
      this.bd.consultar(
        `select e.estado, count(k.id)::int as cantidad
         from unnest(enum_range(null::estado_cooler)) with ordinality as e(estado, orden)
         left join cooler k on k.estado = e.estado and ($1::int is null or k.local_id = $1)
         group by e.estado, e.orden
         order by e.orden`,
        [local],
      ),
    ]);
    return { ...indicadores, coolersPorEstado: coolers };
  }

  // Rutas y órdenes de pedido de cada local en un mes. No cuenta las rutas
  // pre-cargadas (en espera): todavía no han salido.
  @Get('locales')
  locales(
    @Query() q: FiltroActividadLocalesDto,
    @UsuarioActual() usuario: UsuarioSesion,
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
      [q.mes, q.ciudadId ?? null, localVisible(usuario, q.localId)],
    );
  }

  @Get('locales/excel')
  @Roles(...EXPORTAN)
  async localesExcel(
    @Query() q: FiltroActividadLocalesDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    const [anio, mes] = q.mes.split('-');
    return excel(
      `Actividad por local ${mes}-${anio}`,
      `Locales ${mes}-${anio}`,
      COLUMNAS_EXCEL,
      await this.locales(q, usuario),
    );
  }
}
