import {
  Body,
  Controller,
  HttpCode,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { Roles, UsuarioActual, type UsuarioSesion } from '../auth/sesion.js';
import { BdService } from '../bd/bd.service.js';
import { localVisible } from '../comun/alcance.js';
import { DevolucionDto } from './ruta.dto.js';
import { RutasService } from './rutas.service.js';

// Un cooler que vuelve al local: se lee su código con la pistola y queda
// devuelto en la ruta que lo tenía (en ejecución o pendiente). Sirve igual al
// cerrar una ruta que para un cooler que vuelve días después.
@Controller('devoluciones')
@Roles('admin', 'encargado', 'coordinador')
export class DevolucionesController {
  constructor(
    private readonly bd: BdService,
    private readonly rutas: RutasService,
  ) {}

  @Post()
  @HttpCode(200)
  async devolver(
    @Body() dto: DevolucionDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    // Un cooler de otro local se trata igual que uno que no existe.
    const [cooler] = await this.bd.consultar<{ id: number }>(
      `select k.id, k.nombre, k.codigo, t.color
       from cooler k join tipo_cooler t on t.id = k.tipo_cooler_id
       where k.codigo = $1 and ($2::int is null or k.local_id = $2)`,
      [dto.codigo, localVisible(usuario)],
    );
    if (!cooler) {
      throw new NotFoundException({
        statusCode: 404,
        codigo: 'cooler_no_existe',
      });
    }
    const [{ rutaId }] = await this.bd.consultar<{ rutaId: number }>(
      'select cooler_devolver($1) as "rutaId"',
      [cooler.id],
    );
    return { cooler, ruta: await this.rutas.buscar(rutaId, usuario) };
  }
}
