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
import {
  AtrasoDto,
  FiltroAtrasosDto,
  type TipoAtraso,
} from './registro.dto.js';
import { DONDE_COMUN, filtrosComunes, noExiste } from './registros.js';

export interface Atraso {
  id: number;
  fecha: string;
  localId: number;
  local: string;
  ciudad: string;
  tipo: TipoAtraso;
  cantidad: number;
}

const SELECT_ATRASO = `
  select x.id, x.fecha, x.local_id as "localId", l.nombre as local, c.nombre as ciudad,
         x.tipo, x.cantidad
  from atraso x
  join local l on l.id = x.local_id
  join ciudad c on c.id = l.ciudad_id`;

// Tras los comunes: $4 tipo.
const DONDE = `
  where ${DONDE_COMUN}
    and ($4::tipo_atraso is null or x.tipo = $4)`;

const COLUMNAS_EXCEL: Columna<Atraso>[] = [
  { titulo: 'N°', valor: (a) => a.id },
  { titulo: 'Fecha', valor: (a) => a.fecha, tipo: 'fecha' },
  { titulo: 'Local', valor: (a) => a.local },
  { titulo: 'Ciudad', valor: (a) => a.ciudad },
  {
    titulo: 'Tipo',
    valor: (a) => (a.tipo === 'despacho' ? 'Despacho' : 'Picking'),
  },
  { titulo: 'Órdenes', valor: (a) => a.cantidad, tipo: 'numero' },
];

// Órdenes que un local dejó atrasadas en un día. Todos los roles las ven; las
// anotan y corrigen admin, encargado y coordinador, y las elimina solo admin.
@Controller('atrasos')
@Roles('admin', 'encargado', 'coordinador')
export class AtrasosController {
  constructor(private readonly bd: BdService) {}

  @Get()
  @Roles(...TODOS_LOS_ROLES)
  async listar(
    @Query() q: FiltroAtrasosDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<Pagina<Atraso>> {
    const filtros = this.filtros(q, usuario);
    const [items, [{ total }]] = await Promise.all([
      this.bd.consultar<Atraso>(
        `${SELECT_ATRASO} ${DONDE}
         order by x.fecha desc, x.id desc limit $5 offset $6`,
        [...filtros, q.limite, q.desde],
      ),
      this.bd.consultar<{ total: number }>(
        `select count(*)::int as total from atraso x ${DONDE}`,
        filtros,
      ),
    ]);
    return { items, total };
  }

  @Get('excel')
  @Roles(...EXPORTAN)
  async excel(
    @Query() q: FiltroAtrasosDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    const atrasos = await this.bd.consultar<Atraso>(
      `${SELECT_ATRASO} ${DONDE}
       order by x.fecha desc, x.id desc limit ${MAX_FILAS_EXCEL}`,
      this.filtros(q, usuario),
    );
    return excel('Atrasos', 'Atrasos', COLUMNAS_EXCEL, atrasos);
  }

  @Post()
  async crear(@Body() dto: AtrasoDto, @UsuarioActual() usuario: UsuarioSesion) {
    exigirLocal(usuario, dto.localId);
    const [{ id }] = await this.bd.consultar<{ id: number }>(
      `insert into atraso (local_id, tipo, fecha, cantidad)
       values ($1, $2, $3, $4) returning id`,
      [dto.localId, dto.tipo, dto.fecha, dto.cantidad],
    );
    return this.buscar(id, usuario);
  }

  @Put(':id')
  async editar(
    @Param('id', IdPipe) id: number,
    @Body() dto: AtrasoDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    await this.buscar(id, usuario);
    exigirLocal(usuario, dto.localId);
    await this.bd.consultar(
      `update atraso set local_id = $2, tipo = $3, fecha = $4, cantidad = $5
       where id = $1`,
      [id, dto.localId, dto.tipo, dto.fecha, dto.cantidad],
    );
    return this.buscar(id, usuario);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(204)
  async eliminar(@Param('id', IdPipe) id: number) {
    const borrados = await this.bd.consultar(
      'delete from atraso where id = $1 returning id',
      [id],
    );
    if (borrados.length === 0) {
      noExiste('atraso_no_existe');
    }
  }

  // $1..$4 de DONDE.
  private filtros(q: FiltroAtrasosDto, usuario: UsuarioSesion) {
    return [
      ...filtrosComunes(q, localVisible(usuario, q.localId)),
      q.tipo ?? null,
    ];
  }

  // Un atraso de otro local se trata igual que uno que no existe.
  private async buscar(id: number, usuario: UsuarioSesion) {
    const [atraso] = await this.bd.consultar<Atraso>(
      `${SELECT_ATRASO} where x.id = $1 and ($2::int is null or x.local_id = $2)`,
      [id, usuario.localId],
    );
    return atraso ?? noExiste('atraso_no_existe');
  }
}
