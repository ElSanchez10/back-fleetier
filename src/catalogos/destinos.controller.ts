import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Roles, TODOS_LOS_ROLES } from '../auth/sesion.js';
import { BdService } from '../bd/bd.service.js';
import { IdPipe } from '../comun/id.pipe.js';
import { DestinoDto } from './catalogo.dto.js';
import { Mantenedor } from './mantenedor.js';

// Destinos de los pedidos especiales, con el precio que se propone para cada uno.
// Todos los roles pueden leerlos (los usan los formularios de la app); solo un
// admin los modifica.
@Controller('destinos')
export class DestinosController {
  private readonly mantenedor: Mantenedor<DestinoDto>;

  constructor(bd: BdService) {
    this.mantenedor = new Mantenedor(bd, {
      tabla: 'destino_pedido_especial',
      select: `select c.id, c.nombre, c.precio_base as "precioBase" from destino_pedido_especial c`,
      orden: 'lower(c.nombre)',
      columnas: { nombre: 'nombre', precioBase: 'precio_base' },
    });
  }

  @Get()
  @Roles(...TODOS_LOS_ROLES)
  listar() {
    return this.mantenedor.listar();
  }

  @Post()
  crear(@Body() dto: DestinoDto) {
    return this.mantenedor.crear(dto);
  }

  @Put(':id')
  editar(@Param('id', IdPipe) id: number, @Body() dto: DestinoDto) {
    return this.mantenedor.editar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  eliminar(@Param('id', IdPipe) id: number) {
    return this.mantenedor.eliminar(id);
  }
}
