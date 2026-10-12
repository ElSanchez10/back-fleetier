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
import { TipoEventoDto } from './catalogo.dto.js';
import { Mantenedor } from './mantenedor.js';

// Tipos de evento del calendario de un conductor.
// Todos los roles pueden leerlos (los usan los formularios de la app); solo un
// admin los modifica.
@Controller('tipos-evento')
export class TiposEventoController {
  private readonly mantenedor: Mantenedor<TipoEventoDto>;

  constructor(bd: BdService) {
    this.mantenedor = new Mantenedor(bd, {
      tabla: 'tipo_evento',
      select: `select c.id, c.nombre, c.color from tipo_evento c`,
      orden: 'lower(c.nombre)',
      columnas: { nombre: 'nombre', color: 'color' },
    });
  }

  @Get()
  @Roles(...TODOS_LOS_ROLES)
  listar() {
    return this.mantenedor.listar();
  }

  @Post()
  crear(@Body() dto: TipoEventoDto) {
    return this.mantenedor.crear(dto);
  }

  @Put(':id')
  editar(@Param('id', IdPipe) id: number, @Body() dto: TipoEventoDto) {
    return this.mantenedor.editar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  eliminar(@Param('id', IdPipe) id: number) {
    return this.mantenedor.eliminar(id);
  }
}
