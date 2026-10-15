import {
  Body,
  Controller,
  Delete,
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
import {
  type Columna,
  excel,
  EXPORTAN,
  MAX_FILAS_EXCEL,
} from '../comun/excel.js';
import { Pagina } from '../comun/paginacion.js';
import { contiene, ordenarPor, patron } from '../comun/sql.js';
import { ConductoresService } from '../conductores/conductores.service.js';
import { CasoDto, FiltroRegistrosDto } from './registro.dto.js';
import { DONDE_COMUN, filtrosComunes, noExiste } from './registros.js';

export interface Caso {
  id: number;
  fecha: string;
  localId: number;
  local: string;
  ciudad: string;
  conductorId: number;
  conductor: string;
  descripcion: string;
}

const SELECT_CASO = `
  select x.id, x.fecha, x.local_id as "localId", l.nombre as local, c.nombre as ciudad,
         x.conductor_id as "conductorId", d.nombre as conductor, x.descripcion
  from caso_excepcional x
  join local l on l.id = x.local_id
  join ciudad c on c.id = l.ciudad_id
  join conductor d on d.id = x.conductor_id`;

// Tras los comunes: $4 texto (conductor o descripción).
const DONDE = `
  where ${DONDE_COMUN}
    and (${contiene('d.nombre', '$4')} or ${contiene('x.descripcion', '$4')})`;

// Columnas por las que se ordena el listado.
const ORDEN = {
  id: 'x.id',
  fecha: 'x.fecha',
  local: 'lower(l.nombre)',
  conductor: 'lower(d.nombre)',
};

const COLUMNAS_EXCEL: Columna<Caso>[] = [
  { titulo: 'N°', valor: (c) => c.id },
  { titulo: 'Fecha', valor: (c) => c.fecha, tipo: 'fecha' },
  { titulo: 'Local', valor: (c) => c.local },
  { titulo: 'Ciudad', valor: (c) => c.ciudad },
  { titulo: 'Conductor', valor: (c) => c.conductor },
  { titulo: 'Descripción', valor: (c) => c.descripcion },
];

// Casos excepcionales de un conductor en un local. Todos los roles los ven;
// los anotan y corrigen admin, encargado y coordinador, y los elimina solo admin.
@Controller('casos')
@Roles('admin', 'encargado', 'coordinador')
export class CasosController {
  constructor(
    private readonly bd: BdService,
    private readonly conductores: ConductoresService,
  ) {}

  @Get()
  @Roles(...TODOS_LOS_ROLES)
  async listar(
    @Query() q: FiltroRegistrosDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<Pagina<Caso>> {
    const filtros = this.filtros(q, usuario);
    const [items, [{ total }]] = await Promise.all([
      this.bd.consultar<Caso>(
        `${SELECT_CASO} ${DONDE}
         ${ordenarPor(q, ORDEN, 'x.fecha desc, x.id desc', 'x.id')}
         limit $5 offset $6`,
        [...filtros, q.limite, q.desde],
      ),
      this.bd.consultar<{ total: number }>(
        `select count(*)::int as total
         from caso_excepcional x
         join conductor d on d.id = x.conductor_id ${DONDE}`,
        filtros,
      ),
    ]);
    return { items, total };
  }

  @Get('excel')
  @Roles(...EXPORTAN)
  async excel(
    @Query() q: FiltroRegistrosDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    const casos = await this.bd.consultar<Caso>(
      `${SELECT_CASO} ${DONDE}
       order by x.fecha desc, x.id desc limit ${MAX_FILAS_EXCEL}`,
      this.filtros(q, usuario),
    );
    return excel('Casos excepcionales', 'Casos', COLUMNAS_EXCEL, casos);
  }

  @Post()
  async crear(@Body() dto: CasoDto, @UsuarioActual() usuario: UsuarioSesion) {
    await this.validar(dto, usuario);
    const [{ id }] = await this.bd.consultar<{ id: number }>(
      `insert into caso_excepcional (local_id, conductor_id, fecha, descripcion)
       values ($1, $2, $3, $4) returning id`,
      [dto.localId, dto.conductorId, dto.fecha, dto.descripcion],
    );
    return this.buscar(id, usuario);
  }

  @Put(':id')
  async editar(
    @Param('id', IdPipe) id: number,
    @Body() dto: CasoDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    const actual = await this.buscar(id, usuario);
    // Se puede dejar el conductor que ya tenía aunque hoy sea de otra ciudad.
    await this.validar(dto, usuario, actual.conductorId);
    await this.bd.consultar(
      `update caso_excepcional
       set local_id = $2, conductor_id = $3, fecha = $4, descripcion = $5
       where id = $1`,
      [id, dto.localId, dto.conductorId, dto.fecha, dto.descripcion],
    );
    return this.buscar(id, usuario);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(204)
  async eliminar(@Param('id', IdPipe) id: number) {
    const borrados = await this.bd.consultar(
      'delete from caso_excepcional where id = $1 returning id',
      [id],
    );
    if (borrados.length === 0) {
      noExiste('caso_no_existe');
    }
  }

  // $1..$4 de DONDE.
  private filtros(q: FiltroRegistrosDto, usuario: UsuarioSesion) {
    return [
      ...filtrosComunes(q, localVisible(usuario, q.localId)),
      patron(q.buscar),
    ];
  }

  // Un caso de otro local se trata igual que uno que no existe.
  private async buscar(id: number, usuario: UsuarioSesion) {
    const [caso] = await this.bd.consultar<Caso>(
      `${SELECT_CASO} where x.id = $1 and ($2::int is null or x.local_id = $2)`,
      [id, usuario.localId],
    );
    return caso ?? noExiste('caso_no_existe');
  }

  // La cuenta debe poder operar el local y ver al conductor (su ciudad).
  private async validar(
    dto: CasoDto,
    usuario: UsuarioSesion,
    conductorActual?: number,
  ) {
    exigirLocal(usuario, dto.localId);
    if (dto.conductorId !== conductorActual) {
      await this.conductores.buscar(dto.conductorId, usuario);
    }
  }
}
