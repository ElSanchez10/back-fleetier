import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import {
  Roles,
  TODOS_LOS_ROLES,
  UsuarioActual,
  type UsuarioSesion,
} from '../auth/sesion.js';
import { BdService } from '../bd/bd.service.js';
import { IdPipe } from '../comun/id.pipe.js';
import { Pagina } from '../comun/paginacion.js';
import { contiene, patron } from '../comun/sql.js';
import { ConductorDto, FiltroConductoresDto } from './conductor.dto.js';
import {
  type Conductor,
  ConductoresService,
  enSuCiudad,
  SELECT_CONDUCTOR,
} from './conductores.service.js';

// $1 texto, $2 tipo, $3 ciudad pedida, $4 local de la cuenta.
// El RUN también se encuentra escrito con puntos: se le quitan antes de comparar.
const DONDE = `
  where (${contiene('d.nombre', '$1')}
         or ${contiene('d.email', '$1')}
         or d.telefono like $1
         or d.run ilike replace($1, '.', ''))
    and ($2::int is null or d.tipo_conductor_id = $2)
    and ($3::int is null or d.ciudad_id = $3)
    and ${enSuCiudad('$4')}`;

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
    const filtros = [
      patron(q.buscar),
      q.tipoConductorId ?? null,
      q.ciudadId ?? null,
      usuario.localId,
    ];
    const [items, [{ total }], [resumen]] = await Promise.all([
      this.bd.consultar<Conductor>(
        `${SELECT_CONDUCTOR} ${DONDE} order by lower(d.nombre), d.id limit $5 offset $6`,
        [...filtros, q.limite, q.desde],
      ),
      this.bd.consultar<{ total: number }>(
        `select count(*)::int as total from conductor d ${DONDE}`,
        filtros,
      ),
      // Todavía no existen las rutas: nadie está en ruta y todos están
      // disponibles. Se calcula de verdad cuando entre el módulo de rutas.
      this.bd.consultar(
        `select count(*)::int as total,
                count(*)::int as disponibles,
                0 as "enRuta"
         from conductor d
         where ${enSuCiudad('$1')}`,
        [usuario.localId],
      ),
    ]);
    return { items, total, resumen };
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
}
