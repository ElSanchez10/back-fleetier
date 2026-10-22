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
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiArchivo,
  ApiErrores,
  ApiPaginaResponse,
  ApiSesion,
} from '@/common/decorators/api.decorator';
import { CoolerResponseDto } from './dto/cooler.response.dto';
import { ListadoCoolersResponseDto } from './dto/listado-coolers.response.dto';
import { RutaDeCoolerResponseDto } from './dto/ruta-de-cooler.response.dto';
import {
  EXPORTAN,
  Roles,
  TODOS_LOS_ROLES,
} from '@/common/decorators/roles.decorator';
import { UsuarioActual } from '@/common/decorators/usuario-actual.decorator';
import type { Pagina } from '@/common/dto/pagina.response.dto';
import { type UsuarioSesion } from '@/common/interfaces/usuario-sesion.interface';
import { IdPipe } from '@/common/pipes/id.pipe';
import {
  type Columna,
  excel,
  MAX_FILAS_EXCEL,
} from '@/common/utils/excel.util';
import { CoolersService } from './coolers.service';
import { EditarCoolerDto } from './dto/editar-cooler.request.dto';
import { FiltroCoolersDto } from './dto/filtro-coolers.query.dto';
import { FiltroRutasCoolerDto } from './dto/filtro-rutas-cooler.query.dto';
import { NuevoCoolerDto } from './dto/nuevo-cooler.request.dto';
import { type EstadoCooler } from './enums/estado-cooler.enum';
import { armarEtiquetas, barrasSvg } from './utils/etiquetas.util';

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
const COLUMNAS_EXCEL: Columna<CoolerResponseDto>[] = [
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
@ApiTags('Coolers')
@ApiSesion()
@Controller('coolers')
@Roles(...TODOS_LOS_ROLES)
export class CoolersController {
  constructor(private readonly coolers: CoolersService) {}

  // Además del tramo pedido, devuelve el resumen de todo lo que la cuenta
  // puede ver (sin los filtros): total, disponibles y en ruta.
  @Get()
  @ApiOperation({
    summary: 'Lista los coolers que la cuenta ve, con el resumen sin filtros',
  })
  @ApiOkResponse({ type: ListadoCoolersResponseDto })
  @ApiErrores(400)
  listar(
    @Query() q: FiltroCoolersDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<ListadoCoolersResponseDto> {
    return this.coolers.listar(q, usuario);
  }

  // PDF con las etiquetas (código de barras) de los coolers que cumplen el filtro.
  @Get('etiquetas')
  @Roles('admin', 'asistente', 'encargado')
  @ApiOperation({
    summary:
      'PDF con las etiquetas (código de barras) de los coolers del filtro',
  })
  @ApiArchivo('application/pdf', 'PDF')
  @ApiErrores(400)
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
  @ApiOperation({ summary: 'Planilla con los coolers que cumplen el filtro' })
  @ApiArchivo(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Planilla Excel',
  )
  @ApiErrores(400)
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
  @ApiOperation({
    summary: 'El cooler que leyó la pistola; puede ser de otro local',
  })
  @ApiOkResponse({ type: CoolerResponseDto })
  @ApiErrores(404)
  porCodigo(@Param('codigo') codigo: string): Promise<CoolerResponseDto> {
    return this.coolers.porCodigo(codigo);
  }

  @Get(':id')
  @ApiOperation({ summary: 'La ficha de un cooler' })
  @ApiOkResponse({ type: CoolerResponseDto })
  @ApiErrores(404)
  uno(
    @Param('id', IdPipe) id: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<CoolerResponseDto> {
    return this.coolers.buscar(id, usuario);
  }

  // El código de barras del cooler, como imagen para mostrar en su ficha.
  @Get(':id/barras.svg')
  @Header('Content-Type', 'image/svg+xml')
  @Header('Cache-Control', 'private, no-cache')
  @ApiOperation({ summary: 'El código de barras del cooler, como imagen SVG' })
  @ApiArchivo('image/svg+xml', 'Imagen SVG')
  @ApiErrores(404)
  async barras(
    @Param('id', IdPipe) id: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<string> {
    return barrasSvg((await this.coolers.buscar(id, usuario)).codigo);
  }

  // Las rutas que ha hecho el cooler en un rango de días, de la más reciente
  // a la más antigua (o por fecha, con `orden=fecha`).
  @Get(':id/rutas')
  @ApiOperation({ summary: 'Las rutas en que ha estado el cooler' })
  @ApiPaginaResponse(RutaDeCoolerResponseDto)
  @ApiErrores(400, 404)
  rutas(
    @Param('id', IdPipe) id: number,
    @Query() q: FiltroRutasCoolerDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<Pagina<RutaDeCoolerResponseDto>> {
    return this.coolers.rutas(id, q, usuario);
  }

  @Get(':id/etiqueta')
  @Roles('admin', 'asistente', 'encargado')
  @ApiOperation({ summary: 'PDF con la etiqueta de un cooler' })
  @ApiArchivo('application/pdf', 'PDF')
  @ApiErrores(404)
  async etiqueta(
    @Param('id', IdPipe) id: number,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    const cooler = await this.coolers.buscar(id, usuario);
    return pdf('barcode.pdf', await armarEtiquetas([cooler]));
  }

  @Post()
  @Roles('admin', 'encargado')
  @ApiOperation({
    summary:
      'Registra un cooler con un código de barras nuevo (admin y encargado)',
  })
  @ApiCreatedResponse({ type: CoolerResponseDto })
  @ApiErrores(400, 409)
  crear(
    @Body() dto: NuevoCoolerDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<CoolerResponseDto> {
    return this.coolers.crear(dto, usuario);
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({
    summary:
      'Edita un cooler; cambiar su estado lo saca de su ruta (solo admin)',
  })
  @ApiOkResponse({ type: CoolerResponseDto })
  @ApiErrores(400, 404, 409)
  editar(
    @Param('id', IdPipe) id: number,
    @Body() dto: EditarCoolerDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<CoolerResponseDto> {
    return this.coolers.editar(id, dto, usuario);
  }
}
