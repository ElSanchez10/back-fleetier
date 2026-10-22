import {
  ApiCreatedResponse,
  ApiNoContentResponse,
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
import { vePrecios } from '../utils/registros.util';
import { FiltroPedidosDto } from './dto/filtro-pedidos.query.dto';
import { PedidoEspecialDto } from './dto/pedido-especial.request.dto';
import { PedidosService } from './pedidos.service';
import { PedidoEspecialResponseDto } from './dto/pedido-especial.response.dto';

// Pedidos que los locales envían a destinos especiales (las reglas, en
// PedidosService). Los cuatro roles los ven, anotan y corrigen; solo admin los
// elimina.
@ApiTags('Pedidos especiales')
@ApiSesion()
@Controller('pedidos-especiales')
@Roles(...TODOS_LOS_ROLES)
export class PedidosController {
  constructor(private readonly pedidos: PedidosService) {}

  @Get()
  @ApiOperation({ summary: 'Lista los pedidos especiales que la cuenta ve' })
  @ApiPaginaResponse(PedidoEspecialResponseDto)
  @ApiErrores(400)
  listar(
    @Query() q: FiltroPedidosDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<Pagina<PedidoEspecialResponseDto>> {
    return this.pedidos.listar(q, usuario);
  }

  // Planilla con los pedidos que cumplen el filtro; el valor, solo para quien lo ve.
  @Get('excel')
  @Roles(...EXPORTAN)
  @ApiOperation({
    summary:
      'Planilla con los pedidos que cumplen el filtro (el precio, solo para admin y asistente)',
  })
  @ApiArchivo(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Planilla Excel',
  )
  @ApiErrores(400)
  async excel(
    @Query() q: FiltroPedidosDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    const vePrecio = vePrecios(usuario.rol);
    const pedidos = await this.pedidos.todos(q, usuario, MAX_FILAS_EXCEL);
    // Las mismas columnas que la planilla de la versión Laravel.
    const columnas: Columna<PedidoEspecialResponseDto>[] = [
      { titulo: 'Identificador', valor: (p) => p.id },
      { titulo: 'Fecha', valor: (p) => p.fecha, tipo: 'fecha' },
      { titulo: 'Local', valor: (p) => p.local },
      { titulo: 'Ciudad', valor: (p) => p.ciudad },
      { titulo: 'Destino', valor: (p) => p.destino },
      {
        titulo: 'Extraordinario (1:sí)',
        valor: (p) => (p.extraordinario ? 1 : 0),
      },
      { titulo: 'Descripción', valor: (p) => p.descripcion },
      { titulo: 'Cantidad OP', valor: (p) => p.cantidad, tipo: 'numero' },
    ];
    if (vePrecio) {
      columnas.push({
        titulo: 'Precio',
        valor: (p) => p.precio,
        tipo: 'pesos',
      });
    }
    return excel(
      'Historial Pedidos Especiales',
      'Especiales',
      columnas,
      pedidos,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Anota un pedido especial' })
  @ApiCreatedResponse({ type: PedidoEspecialResponseDto })
  @ApiErrores(400, 404, 409)
  crear(
    @Body() dto: PedidoEspecialDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<PedidoEspecialResponseDto> {
    return this.pedidos.crear(dto, usuario);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Corrige un pedido especial' })
  @ApiOkResponse({ type: PedidoEspecialResponseDto })
  @ApiErrores(400, 404, 409)
  editar(
    @Param('id', IdPipe) id: number,
    @Body() dto: PedidoEspecialDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<PedidoEspecialResponseDto> {
    return this.pedidos.editar(id, dto, usuario);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(204)
  @ApiOperation({ summary: 'Elimina un pedido especial (solo admin)' })
  @ApiNoContentResponse()
  @ApiErrores(404)
  eliminar(@Param('id', IdPipe) id: number): Promise<void> {
    return this.pedidos.eliminar(id);
  }
}
