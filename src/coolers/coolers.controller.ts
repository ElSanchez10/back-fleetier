import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Put,
  Query,
  StreamableFile,
} from '@nestjs/common';
import {
  Roles,
  TODOS_LOS_ROLES,
  UsuarioActual,
  type UsuarioSesion,
} from '../auth/sesion.js';
import { IdPipe } from '../comun/id.pipe.js';
import {
  type Columna,
  excel,
  EXPORTAN,
  MAX_FILAS_EXCEL,
} from '../comun/excel.js';
import { Pagina } from '../comun/paginacion.js';
import {
  EditarCoolerDto,
  type EstadoCooler,
  FiltroCoolersDto,
  FiltroRutasCoolerDto,
  NuevoCoolerDto,
} from './cooler.dto.js';
import type { Cooler } from './coolers.repositorio.js';
import { CoolersService } from './coolers.service.js';
import { armarEtiquetas, barrasSvg } from './etiquetas.js';

// Las etiquetas de todo un filtro van en un solo PDF: se acota por si acaso.
const MAX_ETIQUETAS = 2000;

const NOMBRE_ESTADO: Record<EstadoCooler, string> = {
  disponible: 'Disponible',
  en_espera: 'En espera',
  en_ruta: 'En ruta',
  pendiente: 'Pendiente',
  no_disponible: 'No disponible',
  danado: 'Dañado',
};

const NOMBRE_CAPACIDAD: Record<string, string> = {
  pequeno: 'Pequeño',
  mediano: 'Mediano',
  grande: 'Grande',
};

// Las mismas columnas que la planilla de la versión Laravel.
const COLUMNAS_EXCEL: Columna<Cooler>[] = [
  { titulo: 'Identificador', valor: (k) => k.id },
  { titulo: 'Cooler', valor: (k) => k.nombre },
  { titulo: 'Adquisición', valor: (k) => k.fechaAdquisicion, tipo: 'fecha' },
  { titulo: 'Tiene Tapa (sí:1)', valor: (k) => (k.tieneTapa ? 1 : 0) },
  { titulo: 'Marca', valor: (k) => k.marca },
  { titulo: 'Capacidad', valor: (k) => NOMBRE_CAPACIDAD[k.capacidad] },
  {
    titulo: 'Color',
    valor: (k) => k.color[0].toUpperCase() + k.color.slice(1),
  },
  { titulo: 'Local', valor: (k) => k.local },
  { titulo: 'Ciudad', valor: (k) => k.ciudad },
  { titulo: 'Estado', valor: (k) => NOMBRE_ESTADO[k.estado] },
];

function pdf(nombre: string, contenido: Buffer) {
  return new StreamableFile(contenido, {
    type: 'application/pdf',
    disposition: `attachment; filename="${nombre}"`,
    length: contenido.length,
  });
}

// Inventario de coolers (las reglas, en CoolersService). Una cuenta con local
// solo ve y registra los de su local.
@Controller('coolers')
@Roles(...TODOS_LOS_ROLES)
export class CoolersController {
  constructor(private readonly coolers: CoolersService) {}

  // Además del tramo pedido, devuelve el resumen de todo lo que la cuenta
  // puede ver (sin los filtros): total, disponibles y en ruta.
  @Get()
  listar(
    @Query() q: FiltroCoolersDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<Pagina<Cooler> & { resumen: unknown }> {
    return this.coolers.listar(q, usuario);
  }

  // PDF con las etiquetas (código de barras) de los coolers que cumplen el filtro.
  @Get('etiquetas')
  @Roles('admin', 'asistente', 'encargado')
  async etiquetas(
    @Query() q: FiltroCoolersDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    const coolers = await this.coolers.todos(q, usuario, MAX_ETIQUETAS);
    return pdf('all-barcode.pdf', await armarEtiquetas(coolers));
  }

  // Planilla con los coolers que cumplen el filtro.
  @Get('excel')
  @Roles(...EXPORTAN)
  async excel(
    @Query() q: FiltroCoolersDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    const coolers = await this.coolers.todos(q, usuario, MAX_FILAS_EXCEL);
    return excel('Coolers', 'Coolers', COLUMNAS_EXCEL, coolers);
  }

  // El cooler que leyó la pistola al armar una ruta. Puede ser de otro local:
  // si físicamente está aquí, se puede usar (el front avisa de qué local es).
  @Get('codigo/:codigo')
  porCodigo(@Param('codigo') codigo: string) {
    return this.coolers.porCodigo(codigo);
  }

  @Get(':id')
  uno(
    @Param('id', IdPipe) id: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.coolers.buscar(id, usuario);
  }

  // El código de barras del cooler, como imagen para mostrar en su ficha.
  @Get(':id/barras.svg')
  @Header('Content-Type', 'image/svg+xml')
  @Header('Cache-Control', 'private, no-cache')
  async barras(
    @Param('id', IdPipe) id: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return barrasSvg((await this.coolers.buscar(id, usuario)).codigo);
  }

  // Las rutas que ha hecho el cooler en un rango de días, de la más reciente
  // a la más antigua (o por fecha, con `orden=fecha`).
  @Get(':id/rutas')
  rutas(
    @Param('id', IdPipe) id: number,
    @Query() q: FiltroRutasCoolerDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<Pagina<unknown>> {
    return this.coolers.rutas(id, q, usuario);
  }

  @Get(':id/etiqueta')
  @Roles('admin', 'asistente', 'encargado')
  async etiqueta(
    @Param('id', IdPipe) id: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    const cooler = await this.coolers.buscar(id, usuario);
    return pdf('barcode.pdf', await armarEtiquetas([cooler]));
  }

  @Post()
  @Roles('admin', 'encargado')
  crear(@Body() dto: NuevoCoolerDto, @UsuarioActual() usuario: UsuarioSesion) {
    return this.coolers.crear(dto, usuario);
  }

  @Put(':id')
  @Roles('admin')
  editar(
    @Param('id', IdPipe) id: number,
    @Body() dto: EditarCoolerDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.coolers.editar(id, dto, usuario);
  }
}
