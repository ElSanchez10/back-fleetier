import {
  Body,
  Controller,
  HttpCode,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { Roles, UsuarioActual, type UsuarioSesion } from '../auth/sesion.js';
import { BdService } from '../bd/bd.service.js';
import { DevolucionDto } from './ruta.dto.js';
import { OperacionesService } from './operaciones.service.js';
import { RutasService } from './rutas.service.js';

// Un cooler que vuelve al local: se lee su código con la pistola, queda
// disponible y devuelto en la ruta que lo tenía (en ejecución o pendiente). Si
// era el último que le faltaba, la ruta queda finalizada. Uno que no estaba en
// ninguna ruta también queda disponible. Sirve igual al finalizar una ruta que
// para un cooler que vuelve días después, y para uno de otro local que llegó
// aquí (no cambia de local; el front avisa).
@Controller('devoluciones')
@Roles('admin', 'encargado', 'coordinador')
export class DevolucionesController {
  constructor(
    private readonly bd: BdService,
    private readonly rutas: RutasService,
    private readonly operaciones: OperacionesService,
  ) {}

  @Post()
  @HttpCode(200)
  async devolver(
    @Body() dto: DevolucionDto,
    @UsuarioActual() usuario: UsuarioSesion,
  ) {
    const [cooler] = await this.bd.consultar<CoolerLeido>(
      `select k.id, k.nombre, k.codigo, t.color, k.estado,
              k.local_id as "localId", l.nombre as local
       from cooler k
       join tipo_cooler t on t.id = k.tipo_cooler_id
       join local l on l.id = k.local_id
       where k.codigo = $1`,
      [dto.codigo],
    );
    if (!cooler) {
      throw new NotFoundException({
        statusCode: 404,
        codigo: 'cooler_no_existe',
      });
    }
    const rutaId = await this.operaciones.devolver(cooler.id);
    const { estado, ...datos } = cooler;
    return {
      cooler: datos,
      // La ruta puede ser de otro local: aquí se muestra igual (número y driver).
      ruta: rutaId === null ? null : await this.rutas.buscar(rutaId, null),
      // No estaba en ninguna ruta y ya estaba disponible: no cambió nada.
      yaDisponible: rutaId === null && estado === 'disponible',
      otroLocal: usuario.localId !== null && usuario.localId !== cooler.localId,
    };
  }
}

interface CoolerLeido {
  id: number;
  nombre: string;
  codigo: string;
  color: string;
  estado: string;
  localId: number;
  local: string;
}
