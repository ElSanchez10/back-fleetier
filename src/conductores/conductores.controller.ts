import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import {
  Roles,
  TODOS_LOS_ROLES,
  UsuarioActual,
  type UsuarioSesion,
} from '../auth/sesion.js';
import { BdService } from '../bd/bd.service.js';
import { IdPipe } from '../comun/id.pipe.js';
import {
  type Columna,
  excel,
  EXPORTAN,
  MAX_FILAS_EXCEL,
} from '../comun/excel.js';
import { Pagina } from '../comun/paginacion.js';
import { contiene, patron } from '../comun/sql.js';
import { ConductorDto, FiltroConductoresDto } from './conductor.dto.js';
import {
  type Conductor,
  ConductoresService,
  EN_RUTA,
  enSuCiudad,
  OCUPADO,
  SELECT_CONDUCTOR,
} from './conductores.service.js';
import { formatearRun } from './run.js';

// $1 texto, $2 tipo, $3 ciudad pedida, $4 local de la cuenta, $5 solo libres.
// El RUN también se encuentra escrito con puntos: se le quitan antes de comparar.
const DONDE = `
  where (${contiene('d.nombre', '$1')}
         or ${contiene('d.email', '$1')}
         or d.telefono like $1
         or d.run ilike replace($1, '.', ''))
    and ($2::int is null or d.tipo_conductor_id = $2)
    and ($3::int is null or d.ciudad_id = $3)
    and ${enSuCiudad('$4')}
    and ($5::boolean is not true or not ${OCUPADO})`;

const COLUMNAS_EXCEL: Columna<Conductor>[] = [
  { titulo: 'N°', valor: (d) => d.id },
  { titulo: 'Nombre', valor: (d) => d.nombre },
  { titulo: 'RUN', valor: (d) => formatearRun(d.run) },
  {
    titulo: 'Fecha de nacimiento',
    valor: (d) => d.fechaNacimiento,
    tipo: 'fecha',
  },
  { titulo: 'Teléfono', valor: (d) => d.telefono },
  { titulo: 'Correo', valor: (d) => d.email },
  { titulo: 'Ciudad', valor: (d) => d.ciudad },
  { titulo: 'Clasificación', valor: (d) => d.tipoConductor },
  {
    titulo: 'Última ruta',
    valor: (d) => d.ultimaRuta?.fecha ?? null,
    tipo: 'fechaHora',
  },
];

// Conductores que hacen las rutas. Todos los roles los ven; los registran y
// editan admin y asistente.
@Controller('conductores')
@Roles(...TODOS_LOS_ROLES)
export class ConductoresController {
  constructor(
    private readonly bd: BdService,
    private readonly conductores: ConductoresService,
  ) {}

  // Además del tramo pedido, devuelve el resumen de todos los que la cuenta
  // puede ver (sin los filtros).
  @Get()
  async listar(
    @Query() q: FiltroConductoresDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<Pagina<Conductor> & { resumen: unknown }> {
    const filtros = this.filtros(q, usuario);
    const [items, [{ total }], [resumen]] = await Promise.all([
      this.bd.consultar<Conductor>(
        `${SELECT_CONDUCTOR} ${DONDE} order by lower(d.nombre), d.id limit $6 offset $7`,
        [...filtros, q.limite, q.desde],
      ),
      this.bd.consultar<{ total: number }>(
        `select count(*)::int as total from conductor d ${DONDE}`,
        filtros,
      ),
      // Disponible: sin ruta abierta. En ruta: su ruta ya partió.
      this.bd.consultar(
        `select count(*)::int as total,
                count(*) filter (where not ${OCUPADO})::int as disponibles,
                count(*) filter (where ${EN_RUTA})::int as "enRuta"
         from conductor d
         where ${enSuCiudad('$1')}`,
        [usuario.localId],
      ),
    ]);
    return { items, total, resumen };
  }

  // Planilla con los conductores que cumplen el filtro.
  @Get('excel')
  @Roles(...EXPORTAN)
  async excel(
    @Query() q: FiltroConductoresDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    const conductores = await this.bd.consultar<Conductor>(
      `${SELECT_CONDUCTOR} ${DONDE} order by lower(d.nombre), d.id limit ${MAX_FILAS_EXCEL}`,
      this.filtros(q, usuario),
    );
    return excel('Conductores', 'Conductores', COLUMNAS_EXCEL, conductores);
  }

  @Get(':id')
  uno(
    @Param('id', IdPipe) id: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.conductores.buscar(id, usuario);
  }

  @Post()
  @Roles('admin', 'asistente')
  async crear(
    @Body() dto: ConductorDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    const [{ id }] = await this.bd.consultar<{ id: number }>(
      `insert into conductor (nombre, run, fecha_nacimiento, telefono, email, ciudad_id, tipo_conductor_id)
       values ($1, $2, $3, $4, $5, $6, $7) returning id`,
      [
        dto.nombre,
        dto.run,
        dto.fechaNacimiento,
        dto.telefono,
        dto.email,
        dto.ciudadId,
        dto.tipoConductorId,
      ],
    );
    return this.conductores.buscar(id, usuario);
  }

  @Put(':id')
  @Roles('admin', 'asistente')
  async editar(
    @Param('id', IdPipe) id: number,
    @Body() dto: ConductorDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    await this.conductores.buscar(id, usuario);
    await this.bd.consultar(
      `update conductor
       set nombre = $2, run = $3, fecha_nacimiento = $4, telefono = $5,
           email = $6, ciudad_id = $7, tipo_conductor_id = $8
       where id = $1`,
      [
        id,
        dto.nombre,
        dto.run,
        dto.fechaNacimiento,
        dto.telefono,
        dto.email,
        dto.ciudadId,
        dto.tipoConductorId,
      ],
    );
    return this.conductores.buscar(id, usuario);
  }

  // $1..$5 de DONDE.
  private filtros(q: FiltroConductoresDto, usuario: UsuarioSesion) {
    return [
      patron(q.buscar),
      q.tipoConductorId ?? null,
      q.ciudadId ?? null,
      usuario.localId,
      q.libres ?? null,
    ];
  }
}
