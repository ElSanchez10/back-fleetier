import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  Roles,
  TODOS_LOS_ROLES,
  UsuarioActual,
  type UsuarioSesion,
} from '../auth/sesion.js';
import { BdService } from '../bd/bd.service.js';
import { exigirLocal, localVisible } from '../comun/alcance.js';
import { IdPipe } from '../comun/id.pipe.js';
import { Pagina } from '../comun/paginacion.js';
import {
  type Columna,
  excel,
  EXPORTAN,
  MAX_FILAS_EXCEL,
} from '../comun/excel.js';
import { contiene, HOY, ordenarPor, patron } from '../comun/sql.js';
import { hoyEnChile } from '../comun/validaciones.js';
import { ConductoresService } from '../conductores/conductores.service.js';
import { OperacionesService } from './operaciones.service.js';
import {
  FiltroRutasDto,
  NOMBRE_ESTADO_RUTA,
  NuevaRutaDto,
  RutaDto,
} from './ruta.dto.js';
import {
  DIA_RUTA,
  horaLocal,
  type Ruta,
  RutasService,
  SELECT_RUTA,
} from './rutas.service.js';

// $1 texto (conductor), $2 número de ruta, $3 desde, $4 hasta, $5 estado, $6 local.
const DONDE = `
  where (${contiene("coalesce(d.nombre, '')", '$1')} or r.id = $2::int)
    and ($3::date is null or ${DIA_RUTA} >= $3)
    and ($4::date is null or ${DIA_RUTA} <= $4)
    and ($5::estado_ruta is null or r.estado = $5)
    and ($6::int is null or r.local_id = $6)`;

// Columnas por las que se ordena el historial.
const ORDEN = {
  id: 'r.id',
  fecha: 'r.fecha',
  local: 'lower(l.nombre)',
  estado: 'r.estado',
};

// Las mismas columnas que la planilla de la versión Laravel.
const COLUMNAS_EXCEL: Columna<Ruta>[] = [
  { titulo: 'Identificador', valor: (r) => r.id },
  { titulo: 'Fecha', valor: (r) => r.fecha, tipo: 'fechaHora' },
  {
    titulo: 'Cantidad Ordenes de Pedido',
    valor: (r) => r.ordenes,
    tipo: 'numero',
  },
  { titulo: 'Local', valor: (r) => r.local },
  { titulo: 'Ciudad', valor: (r) => r.ciudad },
  { titulo: 'Estado Ruta', valor: (r) => NOMBRE_ESTADO_RUTA[r.estado] },
  { titulo: 'Conductor', valor: (r) => r.conductor },
];

// Rutas de reparto. Todos los roles las ven; las operan admin, encargado y
// coordinador. Una cuenta con local solo ve y opera las de su local.
// Los cambios de estado los hacen las funciones de la base (bd-dsl/Functions).
@Controller('rutas')
@Roles('admin', 'encargado', 'coordinador')
export class RutasController {
  constructor(
    private readonly bd: BdService,
    private readonly rutas: RutasService,
    private readonly operaciones: OperacionesService,
    private readonly conductores: ConductoresService,
  ) {}

  @Get()
  @Roles(...TODOS_LOS_ROLES)
  async listar(
    @Query() q: FiltroRutasDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<Pagina<Ruta>> {
    const filtros = this.filtros(q, usuario);
    const [items, [{ total }]] = await Promise.all([
      this.bd.consultar<Ruta>(
        `${SELECT_RUTA} ${DONDE}
         ${ordenarPor(q, ORDEN, 'r.fecha desc, r.id desc', 'r.id')}
         limit $7 offset $8`,
        [...filtros, q.limite, q.desde],
      ),
      this.bd.consultar<{ total: number }>(
        `select count(*)::int as total
         from ruta r left join conductor d on d.id = r.conductor_id ${DONDE}`,
        filtros,
      ),
    ]);
    return { items, total };
  }

  // Cuántas rutas de hoy hay en cada estado.
  @Get('resumen')
  @Roles(...TODOS_LOS_ROLES)
  async resumen(@UsuarioActual() usuario: UsuarioSesion) {
    const [resumen] = await this.bd.consultar(
      `select ${HOY}::text as fecha,
              count(*) filter (where estado = 'en_espera')::int as "enEspera",
              count(*) filter (where estado = 'en_ejecucion')::int as "enEjecucion",
              count(*) filter (where estado = 'pendiente')::int as pendientes,
              count(*) filter (where estado = 'finalizada')::int as finalizadas
       from ruta r
       where ${DIA_RUTA} = ${HOY} and ($1::int is null or r.local_id = $1)`,
      [localVisible(usuario)],
    );
    return resumen;
  }

  // Planilla con las rutas que cumplen el filtro (todas, no un tramo).
  @Get('excel')
  @Roles(...EXPORTAN)
  async excel(
    @Query() q: FiltroRutasDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    const rutas = await this.bd.consultar<Ruta>(
      `${SELECT_RUTA} ${DONDE} order by r.fecha desc, r.id desc limit ${MAX_FILAS_EXCEL}`,
      this.filtros(q, usuario),
    );
    const [anio, mes, dia] = hoyEnChile().split('-');
    return excel(
      'Historial Rutas',
      `Rutas al ${dia}-${mes}-${anio}`,
      COLUMNAS_EXCEL,
      rutas,
    );
  }

  // La ruta con sus coolers y sus problemas.
  @Get(':id')
  @Roles(...TODOS_LOS_ROLES)
  async uno(
    @Param('id', IdPipe) id: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    const ruta = await this.rutas.buscar(id, usuario);
    const [coolers, problemas] = await Promise.all([
      this.bd.consultar(
        `select k.id, k.nombre, k.codigo, k.estado, t.color, rc.devuelto,
                ${horaLocal('rc.devuelto_en')} as "devueltoEn"
         from ruta_cooler rc
         join cooler k on k.id = rc.cooler_id
         join tipo_cooler t on t.id = k.tipo_cooler_id
         where rc.ruta_id = $1
         order by length(k.nombre), lower(k.nombre), k.id`,
        [id],
      ),
      this.bd.consultar(
        `select id, cantidad, descripcion, ${horaLocal('creado_en')} as "creadoEn"
         from problema_ruta where ruta_id = $1 order by id`,
        [id],
      ),
    ]);
    return { ...ruta, detalleCoolers: coolers, detalleProblemas: problemas };
  }

  // Registra la ruta: pre-cargada (en espera) o, con `iniciar`, ya en ejecución.
  @Post()
  async crear(
    @Body() dto: NuevaRutaDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    await this.validar(dto, usuario);
    const id = await this.operaciones.crear(dto);
    return this.uno(id, usuario);
  }

  // Corrige la ruta. Como en Laravel, encargado y coordinador la corrigen
  // mientras no ha partido; después, solo un admin. A una ruta cerrada
  // (pendiente o finalizada) ya no se le cambian los coolers.
  @Put(':id')
  async editar(
    @Param('id', IdPipe) id: number,
    @Body() dto: RutaDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    const ruta = await this.rutas.buscar(id, usuario);
    if (ruta.estado !== 'en_espera' && usuario.rol !== 'admin') {
      throw new ForbiddenException({
        statusCode: 403,
        codigo: 'ruta_ya_partio',
      });
    }
    // El conductor que ya tenía la ruta se deja aunque la cuenta no lo vea
    // (un admin pudo prestarlo de otra ciudad); solo se revisa uno nuevo.
    await this.validar(dto, usuario, ruta.conductorId);
    await this.operaciones.editar(id, dto);
    return this.uno(id, usuario);
  }

  @Post(':id/iniciar')
  @HttpCode(200)
  async iniciar(
    @Param('id', IdPipe) id: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    await this.rutas.buscar(id, usuario);
    await this.operaciones.iniciar(id);
    return this.uno(id, usuario);
  }

  // Termina la ruta: queda finalizada si volvieron todos sus coolers, o
  // pendiente si falta alguno.
  @Post(':id/cerrar')
  @HttpCode(200)
  async cerrar(
    @Param('id', IdPipe) id: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    await this.rutas.buscar(id, usuario);
    await this.operaciones.cerrar(id);
    return this.uno(id, usuario);
  }

  // $1..$6 de DONDE.
  private filtros(q: FiltroRutasDto, usuario: UsuarioSesion) {
    // Un número (con o sin "#") busca además esa ruta por su número.
    const numero = /^#?\d{1,9}$/.test(q.buscar ?? '')
      ? Number(q.buscar?.replace('#', ''))
      : null;
    return [
      patron(q.buscar),
      numero,
      q.fechaDesde ?? null,
      q.fechaHasta ?? null,
      q.estado ?? null,
      localVisible(usuario, q.localId),
    ];
  }

  // La cuenta debe poder operar el local, y ver al conductor: una cuenta con
  // local, los de su ciudad; un admin, de cualquier ciudad, como en Laravel.
  // Que los coolers sean del local y que el conductor no esté en otra ruta
  // abierta lo valida la base.
  private async validar(
    dto: RutaDto,
    usuario: UsuarioSesion,
    conductorAnterior: number | null = null,
  ) {
    exigirLocal(usuario, dto.localId);
    if (dto.conductorId !== null && dto.conductorId !== conductorAnterior) {
      await this.conductores.buscar(dto.conductorId, usuario);
    }
  }
}
