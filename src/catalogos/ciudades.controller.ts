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
import { CiudadDto } from './catalogo.dto.js';
import { Mantenedor } from './mantenedor.js';

// Ciudades donde hay locales y conductores.
// Todos los roles pueden leerlos (los usan los formularios de la app); solo un
// admin los modifica.
@Controller('ciudades')
export class CiudadesController {
  private readonly mantenedor: Mantenedor<CiudadDto>;

  constructor(bd: BdService) {
    this.mantenedor = new Mantenedor(bd, {
      tabla: 'ciudad',
      select: `select c.id, c.nombre from ciudad c`,
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
  crear(@Body() dto: CiudadDto) {
    return this.mantenedor.crear(dto);
  }

  @Put(':id')
  editar(@Param('id', IdPipe) id: number, @Body() dto: CiudadDto) {
    return this.mantenedor.editar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  eliminar(@Param('id', IdPipe) id: number) {
    return this.mantenedor.eliminar(id);
  }
}
