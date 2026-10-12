import {
  Body,
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { randomInt } from 'node:crypto';
import pg from 'pg';
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
import { contiene, patron } from '../comun/sql.js';
import {
  CoolerDto,
  EditarCoolerDto,
  type EstadoCooler,
  FiltroCoolersDto,
} from './cooler.dto.js';
import { armarEtiquetas, barrasSvg } from './etiquetas.js';

export interface Cooler {
  id: number;
  nombre: string;
  codigo: string;
  fechaAdquisicion: string;
  tieneTapa: boolean;
  estado: EstadoCooler;
  tipoCoolerId: number;
  marca: string;
  capacidad: string;
  color: string;
  localId: number;
  local: string;
  ciudad: string;
}

const SELECT_COOLER = `
  select k.id,
         k.nombre,
         k.codigo,
         k.fecha_adquisicion as "fechaAdquisicion",
         k.tiene_tapa as "tieneTapa",
         k.estado,
         k.tipo_cooler_id as "tipoCoolerId",
         t.marca,
         t.capacidad,
         t.color,
         k.local_id as "localId",
         l.nombre as local,
         c.nombre as ciudad
  from cooler k
  join tipo_cooler t on t.id = k.tipo_cooler_id
  join local l on l.id = k.local_id
  join ciudad c on c.id = l.ciudad_id`;

// Filtros comunes al listado y a las etiquetas: $1 texto, $2 estado, $3 local.
const DONDE = `
  where ${contiene('k.nombre', '$1')}
    and ($2::estado_cooler is null or k.estado = $2)
    and ($3::int is null or k.local_id = $3)`;

// Primero por estado; dentro de él, por número ("2" antes que "10").
const ORDEN = 'k.estado, length(k.nombre), lower(k.nombre), k.id';

// Las etiquetas de todo un filtro van en un solo PDF: se acota por si acaso.
const MAX_ETIQUETAS = 2000;
const INTENTOS_CODIGO = 5;

function noExiste(): never {
  throw new NotFoundException({ statusCode: 404, codigo: 'cooler_no_existe' });
}

function pdf(nombre: string, contenido: Buffer) {
  return new StreamableFile(contenido, {
    type: 'application/pdf',
    disposition: `attachment; filename="${nombre}"`,
    length: contenido.length,
  });
}

// Inventario de coolers. Una cuenta con local solo ve y registra los de su local.
@Controller('coolers')
@Roles(...TODOS_LOS_ROLES)
export class CoolersController {
  constructor(private readonly bd: BdService) {}

  // Además del tramo pedido, devuelve el resumen de todo lo que la cuenta
  // puede ver (sin los filtros): total, disponibles y en ruta.
  @Get()
  async listar(
    @Query() q: FiltroCoolersDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<Pagina<Cooler> & { resumen: unknown }> {
    const filtros = this.filtros(q, usuario);
    const [items, [{ total }], [resumen]] = await Promise.all([
      this.bd.consultar<Cooler>(
        `${SELECT_COOLER} ${DONDE} order by ${ORDEN} limit $4 offset $5`,
        [...filtros, q.limite, q.desde],
      ),
      this.bd.consultar<{ total: number }>(
        `select count(*)::int as total from cooler k ${DONDE}`,
        filtros,
      ),
      this.bd.consultar(
        `select count(*)::int as total,
                count(*) filter (where estado = 'disponible')::int as disponibles,
                count(*) filter (where estado = 'en_ruta')::int as "enRuta"
         from cooler
         where $1::int is null or local_id = $1`,
        [localVisible(usuario)],
      ),
    ]);
    return { items, total, resumen };
  }

  // PDF con las etiquetas (código de barras) de los coolers que cumplen el filtro.
  @Get('etiquetas')
  @Roles('admin', 'asistente', 'encargado')
  async etiquetas(
    @Query() q: FiltroCoolersDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    const coolers = await this.bd.consultar<Cooler>(
      `${SELECT_COOLER} ${DONDE} order by ${ORDEN} limit ${MAX_ETIQUETAS}`,
      this.filtros(q, usuario),
    );
    return pdf('etiquetas-coolers.pdf', await armarEtiquetas(coolers));
  }

  @Get(':id')
  uno(
    @Param('id', IdPipe) id: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.buscar(id, usuario);
  }

  // El código de barras del cooler, como imagen para mostrar en su ficha.
  @Get(':id/barras.svg')
  @Header('Content-Type', 'image/svg+xml')
  @Header('Cache-Control', 'private, no-cache')
  async barras(
    @Param('id', IdPipe) id: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return barrasSvg((await this.buscar(id, usuario)).codigo);
  }

  @Get(':id/etiqueta')
  @Roles('admin', 'asistente', 'encargado')
  async etiqueta(
    @Param('id', IdPipe) id: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    const cooler = await this.buscar(id, usuario);
    return pdf(
      `etiqueta-cooler-${cooler.nombre}.pdf`,
      await armarEtiquetas([cooler]),
    );
  }

  // El cooler nace disponible y con un código de barras nuevo.
  @Post()
  @Roles('admin', 'encargado')
  async crear(@Body() dto: CoolerDto, @UsuarioActual() usuario: UsuarioSesion) {
    exigirLocal(usuario, dto.localId);
    for (let intento = 1; ; intento++) {
      try {
        const [{ id }] = await this.bd.consultar<{ id: number }>(
          `insert into cooler (nombre, codigo, fecha_adquisicion, tiene_tapa, tipo_cooler_id, local_id)
           values ($1, $2, $3, $4, $5, $6) returning id`,
          [
            dto.nombre,
            // Ocho dígitos al azar: cortos de leer y de escribir a mano.
            String(randomInt(0, 100_000_000)).padStart(8, '0'),
            dto.fechaAdquisicion,
            dto.tieneTapa,
            dto.tipoCoolerId,
            dto.localId,
          ],
        );
        return this.buscar(id, usuario);
      } catch (error) {
        // Si justo salió un código que ya existe, se prueba con otro.
        const repetido =
          error instanceof pg.DatabaseError &&
          error.constraint === 'cooler_codigo_uk';
        if (!repetido || intento >= INTENTOS_CODIGO) {
          throw error;
        }
      }
    }
  }

  @Put(':id')
  @Roles('admin')
  async editar(
    @Param('id', IdPipe) id: number,
    @Body() dto: EditarCoolerDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    const cambiados = await this.bd.consultar(
      `update cooler
       set nombre = $2, codigo = $3, fecha_adquisicion = $4, tiene_tapa = $5,
           tipo_cooler_id = $6, local_id = $7, estado = $8
       where id = $1 returning id`,
      [
        id,
        dto.nombre,
        dto.codigo,
        dto.fechaAdquisicion,
        dto.tieneTapa,
        dto.tipoCoolerId,
        dto.localId,
        dto.estado,
      ],
    );
    if (cambiados.length === 0) {
      noExiste();
    }
    return this.buscar(id, usuario);
  }

  private filtros(q: FiltroCoolersDto, usuario: UsuarioSesion) {
    return [
      patron(q.buscar),
      q.estado ?? null,
      localVisible(usuario, q.localId),
    ];
  }

  // Un cooler de otro local se trata igual que uno que no existe.
  private async buscar(id: number, usuario: UsuarioSesion): Promise<Cooler> {
    const [cooler] = await this.bd.consultar<Cooler>(
      `${SELECT_COOLER} where k.id = $1 and ($2::int is null or k.local_id = $2)`,
      [id, localVisible(usuario)],
    );
    return cooler ?? noExiste();
  }
}
