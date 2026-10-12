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
import {
  Roles,
  TODOS_LOS_ROLES,
  UsuarioActual,
  type UsuarioSesion,
} from '../auth/sesion.js';
import { BdService } from '../bd/bd.service.js';
import { IdPipe } from '../comun/id.pipe.js';
import { LocalDto } from './catalogo.dto.js';
import { Mantenedor } from './mantenedor.js';

// Locales desde donde salen las rutas, cada uno en su ciudad.
// Todos los roles pueden leerlos; solo un admin los modifica.
@Controller('locales')
export class LocalesController {
  private readonly mantenedor: Mantenedor<LocalDto>;

  constructor(bd: BdService) {
    this.mantenedor = new Mantenedor(bd, {
      tabla: 'local',
      select: `select c.id,
                      c.nombre,
                      c.direccion,
                      c.ciudad_id as "ciudadId",
                      ci.nombre as ciudad
               from local c
               join ciudad ci on ci.id = c.ciudad_id`,
      orden: 'lower(ci.nombre), lower(c.nombre)',
      columnas: {
        nombre: 'nombre',
        direccion: 'direccion',
        ciudadId: 'ciudad_id',
      },
    });
  }

  // Una cuenta con local solo recibe el suyo: es el único que puede elegir.
  @Get()
  @Roles(...TODOS_LOS_ROLES)
  listar(@UsuarioActual() usuario: UsuarioSesion) {
    return usuario.localId
      ? this.mantenedor.listar('where c.id = $1', [usuario.localId])
      : this.mantenedor.listar();
  }

  @Post()
  crear(@Body() dto: LocalDto) {
    return this.mantenedor.crear(dto);
  }

  @Put(':id')
  editar(@Param('id', IdPipe) id: number, @Body() dto: LocalDto) {
    return this.mantenedor.editar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  eliminar(@Param('id', IdPipe) id: number) {
    return this.mantenedor.eliminar(id);
  }
}
