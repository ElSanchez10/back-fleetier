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
import { IdPipe } from '../comun/id.pipe.js';
import {
  type Columna,
  excel,
  EXPORTAN,
  MAX_FILAS_EXCEL,
} from '../comun/excel.js';
import { Pagina } from '../comun/paginacion.js';
import type { PedidoEspecial } from './pedidos.repositorio.js';
import { PedidosService } from './pedidos.service.js';
import { FiltroPedidosDto, PedidoEspecialDto } from './registro.dto.js';
import { vePrecios } from './registros.js';

// Pedidos que los locales envían a destinos especiales (las reglas, en
// PedidosService). Los cuatro roles los ven, anotan y corrigen; solo admin los
// elimina.
@Controller('pedidos-especiales')
@Roles(...TODOS_LOS_ROLES)
export class PedidosController {
  constructor(private readonly pedidos: PedidosService) {}

  @Get()
  listar(
    @Query() q: FiltroPedidosDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ): Promise<Pagina<PedidoEspecial>> {
    return this.pedidos.listar(q, usuario);
  }

  // Planilla con los pedidos que cumplen el filtro; el valor, solo para quien lo ve.
  @Get('excel')
  @Roles(...EXPORTAN)
  async excel(
    @Query() q: FiltroPedidosDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    const vePrecio = vePrecios(usuario.rol);
    const pedidos = await this.pedidos.todos(q, usuario, MAX_FILAS_EXCEL);
    // Las mismas columnas que la planilla de la versión Laravel.
    const columnas: Columna<PedidoEspecial>[] = [
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
  crear(
    @Body() dto: PedidoEspecialDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.pedidos.crear(dto, usuario);
  }

  @Put(':id')
  editar(
    @Param('id', IdPipe) id: number,
    @Body() dto: PedidoEspecialDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    return this.pedidos.editar(id, dto, usuario);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(204)
  eliminar(@Param('id', IdPipe) id: number) {
    return this.pedidos.eliminar(id);
  }
}
