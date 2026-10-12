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
import { TipoConductorDto } from './catalogo.dto.js';
import { Mantenedor } from './mantenedor.js';

// Clasificación de los conductores.
// Todos los roles pueden leerlos (los usan los formularios de la app); solo un
// admin los modifica.
@Controller('tipos-conductor')
export class TiposConductorController {
  private readonly mantenedor: Mantenedor<TipoConductorDto>;

  constructor(bd: BdService) {
    this.mantenedor = new Mantenedor(bd, {
      tabla: 'tipo_conductor',
      select: `select c.id, c.nombre from tipo_conductor c`,
      orden: 'lower(c.nombre)',
      columnas: { nombre: 'nombre' },
    });
  }

  @Get()
  @Roles(...TODOS_LOS_ROLES)
  listar() {
    return this.mantenedor.listar();
  }

  @Post()
  crear(@Body() dto: TipoConductorDto) {
    return this.mantenedor.crear(dto);
  }

  @Put(':id')
  editar(@Param('id', IdPipe) id: number, @Body() dto: TipoConductorDto) {
    return this.mantenedor.editar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  eliminar(@Param('id', IdPipe) id: number) {
    return this.mantenedor.eliminar(id);
  }
}
