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
import { TipoCoolerDto } from './catalogo.dto.js';
import { CatalogoRepositorio } from './catalogo.repositorio.js';
import { Mantenedor } from './mantenedor.js';

// Tipos de cooler: marca, capacidad y el color con que se muestran.
// Todos los roles pueden leerlos (los usan los formularios de la app); solo un
// admin los modifica. Quien registra un cooler puede además crear uno nuevo
// junto con él (POST /coolers con `tipoNuevo`).
@Controller('tipos-cooler')
export class TiposCoolerController {
  private readonly mantenedor: Mantenedor<TipoCoolerDto>;

  constructor(bd: BdService) {
    this.mantenedor = new Mantenedor(
      new CatalogoRepositorio(bd, {
        tabla: 'tipo_cooler',
        select: `select c.id, c.marca, c.capacidad, c.color from tipo_cooler c`,
        orden: 'lower(c.marca), c.capacidad',
        columnas: { marca: 'marca', capacidad: 'capacidad', color: 'color' },
      }),
    );
  }

  @Get()
  @Roles(...TODOS_LOS_ROLES)
  listar() {
    return this.mantenedor.listar();
  }

  @Post()
  crear(@Body() dto: TipoCoolerDto) {
    return this.mantenedor.crear(dto);
  }

  @Put(':id')
  editar(@Param('id', IdPipe) id: number, @Body() dto: TipoCoolerDto) {
    return this.mantenedor.editar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  eliminar(@Param('id', IdPipe) id: number) {
    return this.mantenedor.eliminar(id);
  }
}
